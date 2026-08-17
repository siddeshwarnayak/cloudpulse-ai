import { ok, ApiError } from "../utils/apiResponse.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { analyzeAnomaly, recommendCostOptimization } from "../services/ai/aiService.js";
import { isAiEnabled } from "../config/env.js";

export const analyze = asyncHandler(async (req, res) => {
  const { cpu, memory, requestsPerMin, responseTimeSec, historicalCpuRange, resourceType, severity } = req.body;
  if (!resourceType) throw new ApiError(400, "resourceType is required");

  const result = await analyzeAnomaly(
    { cpu, memory, requestsPerMin, responseTimeSec, historicalCpuRange, resourceType },
    severity
  );
  return ok(res, result, { aiEnabled: isAiEnabled() });
});

export const recommend = asyncHandler(async (req, res) => {
  const { resourceType, currentSize, utilization, runningDurationHours, monthlyBaseCost } = req.body;
  if (!resourceType || utilization === undefined) {
    throw new ApiError(400, "resourceType and utilization are required");
  }

  const result = await recommendCostOptimization({
    resourceType,
    currentSize,
    utilization,
    runningDurationHours,
    monthlyBaseCost: monthlyBaseCost ?? 70,
  });
  return ok(res, result, { aiEnabled: isAiEnabled() });
});
