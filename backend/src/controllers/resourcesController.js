import { prisma } from "../config/prisma.js";
import { ok, ApiError } from "../utils/apiResponse.js";
import { asyncHandler } from "../middleware/errorHandler.js";

export const listResources = asyncHandler(async (req, res) => {
  const resources = await prisma.resource.findMany({
    orderBy: { resourceType: "asc" },
  });

  // Attach the most recent metric per resource for quick dashboard display.
  const withLatest = await Promise.all(
    resources.map(async (resource) => {
      const latestMetric = await prisma.metric.findFirst({
        where: { resourceId: resource.id },
        orderBy: { timestamp: "desc" },
      });
      const openIncidentCount = await prisma.incident.count({
        where: { resourceId: resource.id, status: "open" },
      });
      return { ...resource, latestMetric, openIncidentCount };
    })
  );

  return ok(res, withLatest);
});

export const getResource = asyncHandler(async (req, res) => {
  const resource = await prisma.resource.findUnique({ where: { id: req.params.id } });
  if (!resource) throw new ApiError(404, "Resource not found");

  const recentMetrics = await prisma.metric.findMany({
    where: { resourceId: resource.id },
    orderBy: { timestamp: "desc" },
    take: 50,
  });

  const recentIncidents = await prisma.incident.findMany({
    where: { resourceId: resource.id },
    orderBy: { detectedAt: "desc" },
    take: 10,
  });

  return ok(res, { ...resource, recentMetrics, recentIncidents });
});
