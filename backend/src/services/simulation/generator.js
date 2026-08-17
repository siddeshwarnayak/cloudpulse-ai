// Per-resource stateful metric generator. Keeps a small amount of state
// per resource (baseline, surge countdown, idle flag) so metrics evolve
// smoothly tick-to-tick instead of being pure independent random noise.

const state = new Map(); // resourceId -> generator state

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function gaussianNoise(scale = 1) {
  // Box-Muller, cheap approximation is fine for simulated telemetry.
  const u = Math.random() || 1e-6;
  const v = Math.random() || 1e-6;
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * scale;
}

function getState(resourceId, defaults) {
  if (!state.has(resourceId)) {
    state.set(resourceId, { ...defaults, surgeTicksLeft: 0, idleMode: false, idleTicksLeft: 0 });
  }
  return state.get(resourceId);
}

function maybeStartSurge(s, chance = 0.03) {
  if (s.surgeTicksLeft <= 0 && Math.random() < chance) {
    s.surgeTicksLeft = 5 + Math.floor(Math.random() * 10); // 5-15 ticks of elevated load
  }
}

function maybeStartIdlePeriod(s, chance = 0.01) {
  if (!s.idleMode && s.surgeTicksLeft <= 0 && Math.random() < chance) {
    s.idleMode = true;
    // Long idle stretch so the 24h idle/waste rule can realistically trigger.
    s.idleTicksLeft = 400 + Math.floor(Math.random() * 400);
  }
}

/**
 * EC2: CPU/memory/responseTime correlate with requestCount, with an
 * occasional traffic surge that ripples through all four.
 */
export function generateEc2Metric(resourceId) {
  const s = getState(resourceId, { baselineCpu: 30, baselineMem: 45, baselineReq: 120 });
  maybeStartSurge(s);
  maybeStartIdlePeriod(s);

  const surging = s.surgeTicksLeft > 0;
  if (surging) s.surgeTicksLeft -= 1;
  if (s.idleMode) {
    s.idleTicksLeft -= 1;
    if (s.idleTicksLeft <= 0) s.idleMode = false;
  }

  const trafficMultiplier = surging ? 2.5 + Math.random() * 1.5 : s.idleMode ? 0.15 : 1;

  const requestCount = Math.max(0, Math.round(s.baselineReq * trafficMultiplier + gaussianNoise(10)));
  const cpu = clamp(s.baselineCpu * trafficMultiplier * 0.9 + gaussianNoise(4), 1, 100);
  const memory = clamp(s.baselineMem + (trafficMultiplier - 1) * 15 + gaussianNoise(3), 5, 100);
  const responseTime = clamp(0.15 + (trafficMultiplier - 1) * 1.6 + Math.max(0, gaussianNoise(0.2)), 0.05, 12);
  const network = clamp(requestCount * (2 + Math.random()), 0, 100000);

  // slow baseline drift so the system doesn't feel perfectly static
  s.baselineCpu = clamp(s.baselineCpu + gaussianNoise(0.4), 15, 55);
  s.baselineMem = clamp(s.baselineMem + gaussianNoise(0.3), 25, 65);

  return { cpu, memory, network, responseTime, requestCount };
}

/**
 * RDS: memory baseline is higher (buffer pool / cache), CPU driven more
 * by query load, response time is sensitive to request load.
 */
export function generateRdsMetric(resourceId) {
  const s = getState(resourceId, { baselineCpu: 25, baselineMem: 65, baselineReq: 300 });
  maybeStartSurge(s, 0.025);
  maybeStartIdlePeriod(s, 0.008);

  const surging = s.surgeTicksLeft > 0;
  if (surging) s.surgeTicksLeft -= 1;
  if (s.idleMode) {
    s.idleTicksLeft -= 1;
    if (s.idleTicksLeft <= 0) s.idleMode = false;
  }

  const loadMultiplier = surging ? 2 + Math.random() * 1.5 : s.idleMode ? 0.2 : 1;

  const requestCount = Math.max(0, Math.round(s.baselineReq * loadMultiplier + gaussianNoise(20)));
  const cpu = clamp(s.baselineCpu * loadMultiplier + gaussianNoise(3), 2, 100);
  const memory = clamp(s.baselineMem + (loadMultiplier - 1) * 8 + gaussianNoise(2), 30, 98);
  const responseTime = clamp(0.08 + (loadMultiplier - 1) * 1.2 + Math.max(0, gaussianNoise(0.15)), 0.03, 10);
  const network = clamp(requestCount * (3 + Math.random() * 2), 0, 150000);

  s.baselineCpu = clamp(s.baselineCpu + gaussianNoise(0.3), 10, 45);
  s.baselineMem = clamp(s.baselineMem + gaussianNoise(0.2), 55, 78);

  return { cpu, memory, network, responseTime, requestCount };
}

/** S3: no CPU/memory (bucket, not compute) - only network + requestCount. */
export function generateS3Metric(resourceId) {
  const s = getState(resourceId, { baselineReq: 60 });
  maybeStartSurge(s, 0.02);

  const surging = s.surgeTicksLeft > 0;
  if (surging) s.surgeTicksLeft -= 1;

  const multiplier = surging ? 3 + Math.random() * 2 : 1;
  const requestCount = Math.max(0, Math.round(s.baselineReq * multiplier + gaussianNoise(8)));
  const network = clamp(requestCount * (5 + Math.random() * 3), 0, 200000);
  const responseTime = clamp(0.05 + Math.max(0, gaussianNoise(0.05)) + (multiplier - 1) * 0.05, 0.01, 2);

  return { cpu: null, memory: null, network, responseTime, requestCount };
}

export function generateMetricFor(resourceType, resourceId) {
  switch (resourceType) {
    case "ec2":
      return generateEc2Metric(resourceId);
    case "rds":
      return generateRdsMetric(resourceId);
    case "s3":
      return generateS3Metric(resourceId);
    default:
      throw new Error(`Unknown resource type: ${resourceType}`);
  }
}

export function resetGeneratorState() {
  state.clear();
}
