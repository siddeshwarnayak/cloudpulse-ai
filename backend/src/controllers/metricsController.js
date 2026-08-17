import { prisma } from "../config/prisma.js";
import { ok } from "../utils/apiResponse.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const MAX_WINDOW = 200; // bounded historical window - never fetch the whole table

export const listRecentMetrics = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, MAX_WINDOW);
  const metrics = await prisma.metric.findMany({
    orderBy: { timestamp: "desc" },
    take: limit,
    include: { resource: { select: { resourceId: true, resourceType: true, region: true } } },
  });
  return ok(res, metrics);
});

export const listMetricsForResource = asyncHandler(async (req, res) => {
  const { resourceId } = req.params;
  const limit = Math.min(Number(req.query.limit) || 100, MAX_WINDOW);

  const metrics = await prisma.metric.findMany({
    where: { resourceId },
    orderBy: { timestamp: "desc" },
    take: limit,
  });

  return ok(res, metrics.reverse()); // chronological order for charting
});
