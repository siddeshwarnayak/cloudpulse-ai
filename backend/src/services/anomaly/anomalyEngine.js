import { prisma } from "../../config/prisma.js";
import { logger } from "../../utils/logger.js";

const TRAILING_WINDOW = 20;
const MEMORY_CONSECUTIVE_REQUIRED = 3;
const IDLE_SIMULATED_HOURS = 24;
const INCIDENT_COOLDOWN_MS = 1000 * 60 * 15; // simulated-time cooldown before re-alerting same type

/**
 * Pulls the trailing N metrics for a resource (most recent first) so the
 * detectors below can compute trailing averages without re-querying per rule.
 */
async function getTrailingMetrics(resourceId, limit = TRAILING_WINDOW) {
  return prisma.metric.findMany({
    where: { resourceId },
    orderBy: { timestamp: "desc" },
    take: limit,
  });
}

function average(values) {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** CPU: current > 85% OR current > 1.5x trailing 20-reading average. */
function detectCpuAnomaly(current, trailing) {
  if (current.cpu == null) return null;
  const history = trailing.filter((m) => m.cpu != null).map((m) => m.cpu);
  const trailingAvg = average(history);

  if (current.cpu > 85) {
    return { anomalyType: "cpu", severity: current.cpu > 95 ? "high" : "medium", reason: `CPU at ${current.cpu.toFixed(1)}% exceeds 85% threshold` };
  }
  if (history.length >= 5 && current.cpu > trailingAvg * 1.5) {
    return { anomalyType: "cpu", severity: "medium", reason: `CPU at ${current.cpu.toFixed(1)}% is 1.5x above trailing average (${trailingAvg.toFixed(1)}%)` };
  }
  return null;
}

/** Memory: > 85% for at least 3 consecutive readings (most recent first, including current). */
function detectMemoryAnomaly(current, trailing) {
  if (current.memory == null) return null;
  const recent = [current, ...trailing].slice(0, MEMORY_CONSECUTIVE_REQUIRED);
  if (recent.length < MEMORY_CONSECUTIVE_REQUIRED) return null;
  const allHigh = recent.every((m) => m.memory != null && m.memory > 85);
  if (allHigh) {
    return { anomalyType: "memory", severity: current.memory > 95 ? "high" : "medium", reason: `Memory above 85% for ${MEMORY_CONSECUTIVE_REQUIRED} consecutive readings (currently ${current.memory.toFixed(1)}%)` };
  }
  return null;
}

/** Traffic: requestCount > 2x trailing average. */
function detectTrafficAnomaly(current, trailing) {
  const history = trailing.map((m) => m.requestCount);
  const trailingAvg = average(history);
  if (trailing.length >= 5 && trailingAvg > 0 && current.requestCount > trailingAvg * 2) {
    return { anomalyType: "traffic", severity: current.requestCount > trailingAvg * 3 ? "high" : "medium", reason: `Request count ${current.requestCount} is more than 2x trailing average (${trailingAvg.toFixed(0)})` };
  }
  return null;
}

/** Response time: > 3 seconds. */
function detectResponseTimeAnomaly(current) {
  if (current.responseTime > 3) {
    return { anomalyType: "responseTime", severity: current.responseTime > 6 ? "high" : "medium", reason: `Response time ${current.responseTime.toFixed(2)}s exceeds 3s threshold` };
  }
  return null;
}

/**
 * Idle/waste: utilization < 15% sustained for >= 24 simulated hours.
 * This does NOT produce an Incident - it feeds the cost-optimization
 * pipeline instead (see services/cost).
 */
async function detectIdleWaste(resource, current, simulatedNow) {
  if (resource.resourceType === "s3") return null; // no utilization concept for S3 in this MVP

  const windowStart = new Date(simulatedNow.getTime() - IDLE_SIMULATED_HOURS * 60 * 60 * 1000);
  const windowMetrics = await prisma.metric.findMany({
    where: { resourceId: resource.id, timestamp: { gte: windowStart } },
    orderBy: { timestamp: "asc" },
  });

  if (windowMetrics.length < 10) return null; // not enough simulated history yet

  const utilizationSamples = windowMetrics
    .map((m) => m.cpu)
    .filter((v) => v != null);

  if (utilizationSamples.length === 0) return null;

  const allIdle = utilizationSamples.every((v) => v < 15);
  if (allIdle) {
    const avgUtil = average(utilizationSamples);
    return { utilization: avgUtil, windowHours: IDLE_SIMULATED_HOURS };
  }
  return null;
}

/**
 * Deduplication: an open incident of the same resource + anomalyType
 * blocks new incident creation. Once resolved, a new incident can be
 * created again after a cooldown window (measured in simulated time)
 * to avoid instant re-triggering off noise right at the resolve boundary.
 */
async function shouldCreateIncident(resourceId, anomalyType, simulatedNow) {
  const openIncident = await prisma.incident.findFirst({
    where: { resourceId, anomalyType, status: "open" },
  });
  if (openIncident) return false;

  const lastResolved = await prisma.incident.findFirst({
    where: { resourceId, anomalyType, status: "resolved" },
    orderBy: { updatedAt: "desc" },
  });
  if (lastResolved) {
    const elapsed = simulatedNow.getTime() - new Date(lastResolved.detectedAt).getTime();
    if (elapsed < INCIDENT_COOLDOWN_MS) return false;
  }
  return true;
}

/**
 * Runs all deterministic rules against the just-inserted metric. Returns
 * the list of newly detected anomalies (post-deduplication) that still
 * need an AI explanation + incident record. Idle/waste anomalies are
 * returned separately and routed to the cost service instead.
 */
export async function evaluateMetric(resource, metric, simulatedNow) {
  const trailing = await getTrailingMetrics(resource.id);
  const detections = [
    detectCpuAnomaly(metric, trailing),
    detectMemoryAnomaly(metric, trailing),
    detectTrafficAnomaly(metric, trailing),
    detectResponseTimeAnomaly(metric),
  ].filter(Boolean);

  const actionable = [];
  for (const detection of detections) {
    const allowed = await shouldCreateIncident(resource.id, detection.anomalyType, simulatedNow);
    if (allowed) actionable.push(detection);
  }

  let idleWaste = null;
  try {
    idleWaste = await detectIdleWaste(resource, metric, simulatedNow);
  } catch (err) {
    logger.error("Idle/waste detection failed:", err.message);
  }

  return { anomalies: actionable, idleWaste };
}
