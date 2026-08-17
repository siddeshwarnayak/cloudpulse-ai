import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { simClock } from "./simClock.js";
import { generateMetricFor } from "./generator.js";
import { evaluateMetric } from "../anomaly/anomalyEngine.js";
import { analyzeAnomaly } from "../ai/aiService.js";
import { recordIdleWasteOpportunity } from "../cost/costService.js";

let intervalHandle = null;
let running = false;
let tickInFlight = false;

function severityRank(s) {
  return { low: 1, medium: 2, high: 3 }[s] ?? 1;
}

async function buildAiInput(resource, metric) {
  const trailingCpu = await prisma.metric.findMany({
    where: { resourceId: resource.id, cpu: { not: null } },
    orderBy: { timestamp: "desc" },
    take: 20,
    select: { cpu: true },
  });
  const cpuValues = trailingCpu.map((m) => m.cpu);
  const historicalCpuRange =
    cpuValues.length > 0 ? { min: Math.min(...cpuValues), max: Math.max(...cpuValues) } : { min: null, max: null };

  return {
    cpu: metric.cpu,
    memory: metric.memory,
    requestsPerMin: metric.requestCount,
    responseTimeSec: metric.responseTime,
    historicalCpuRange,
    resourceType: resource.resourceType,
  };
}

async function handleAnomalies(resource, metric, anomalies, simulatedNow) {
  for (const anomaly of anomalies) {
    try {
      const aiInput = await buildAiInput(resource, metric);
      const analysis = await analyzeAnomaly(aiInput, anomaly.severity);

      // AI severity is advisory context; the rule engine's severity is
      // authoritative for what gets stored, but we upgrade to AI severity
      // if AI assessed it as *more* severe than the rule did.
      const finalSeverity =
        severityRank(analysis.severity) > severityRank(anomaly.severity) ? analysis.severity : anomaly.severity;

      await prisma.incident.create({
        data: {
          resourceId: resource.id,
          severity: finalSeverity,
          anomalyType: anomaly.anomalyType,
          detectedAt: simulatedNow,
          aiAnalysis: analysis.cause,
          recommendation: {
            impact: analysis.impact,
            recommendations: analysis.recommendations,
            aiGenerated: analysis.aiGenerated,
            ruleReason: anomaly.reason,
          },
          status: "open",
        },
      });

      logger.info(`Incident created: ${resource.resourceId} / ${anomaly.anomalyType} / ${finalSeverity}`);
    } catch (err) {
      // A single incident write failure must not kill the simulation loop.
      logger.error(`Failed to create incident for ${resource.resourceId}:`, err.message);
    }
  }
}

async function tick() {
  if (tickInFlight) return; // avoid overlapping ticks if a previous one is slow
  tickInFlight = true;

  const simulatedNow = simClock.tick();

  try {
    const resources = await prisma.resource.findMany({ where: { status: { not: "stopped" } } });

    for (const resource of resources) {
      try {
        const generated = generateMetricFor(resource.resourceType, resource.id);

        const metric = await prisma.metric.create({
          data: {
            resourceId: resource.id,
            cpu: generated.cpu,
            memory: generated.memory,
            network: generated.network,
            responseTime: generated.responseTime,
            requestCount: generated.requestCount,
            timestamp: simulatedNow,
          },
        });

        const { anomalies, idleWaste } = await evaluateMetric(resource, metric, simulatedNow);

        if (anomalies.length > 0) {
          await handleAnomalies(resource, metric, anomalies, simulatedNow);
        }

        if (idleWaste) {
          await recordIdleWasteOpportunity(resource, idleWaste);
        }
      } catch (perResourceErr) {
        // Isolate failures per-resource so one bad write doesn't stop
        // metric generation for the rest of the fleet this tick.
        logger.error(`Tick failed for resource ${resource.resourceId}:`, perResourceErr.message);
      }
    }
  } catch (err) {
    logger.error("Simulation tick failed:", err.message);
  } finally {
    tickInFlight = false;
  }
}

export function startSimulator() {
  if (running) return;
  running = true;
  logger.info(
    `Starting simulator: tick every ${env.METRIC_TICK_INTERVAL_MS}ms, ` +
      `1 real second = ${env.SIMULATION_TIME_MULTIPLIER} simulated minutes`
  );
  intervalHandle = setInterval(() => {
    tick().catch((err) => logger.error("Unhandled tick error:", err));
  }, env.METRIC_TICK_INTERVAL_MS);
}

export function stopSimulator() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  running = false;
  logger.info("Simulator stopped.");
}

export function isSimulatorRunning() {
  return running;
}
