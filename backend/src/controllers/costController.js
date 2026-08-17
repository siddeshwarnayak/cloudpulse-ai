import { ok } from "../utils/apiResponse.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { getEstimatedMonthlyCost, listCostRecommendations } from "../services/cost/costService.js";

export const getCostSummary = asyncHandler(async (req, res) => {
  const summary = await getEstimatedMonthlyCost();
  return ok(res, summary);
});

export const getCostRecommendations = asyncHandler(async (req, res) => {
  const recommendations = await listCostRecommendations();
  return ok(res, recommendations);
});
