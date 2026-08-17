import { prisma } from "../config/prisma.js";
import { ok, ApiError } from "../utils/apiResponse.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { analyzeAnomaly } from "../services/ai/aiService.js";

export const listAnomalies = asyncHandler(async (req, res) => {
  const status = req.query.status; // "open" | "resolved" | undefined
  const incidents = await prisma.incident.findMany({
    where: status ? { status } : undefined,
    orderBy: { detectedAt: "desc" },
    take: 100,
    include: { resource: { select: { resourceId: true, resourceType: true, region: true } } },
  });
  return ok(res, incidents);
});

/**
 * On-demand analysis endpoint: lets the frontend (or a future manual
 * trigger) run the AI analysis for an arbitrary metric snapshot, e.g.
 * for a "re-analyze" button. Does not create an Incident by itself.
 */
export const analyzeAnomalyOnDemand = asyncHandler(async (req, res) => {
  const { cpu, memory, requestsPerMin, responseTimeSec, historicalCpuRange, resourceType, severity } = req.body;

  if (!resourceType) throw new ApiError(400, "resourceType is required");

  const analysis = await analyzeAnomaly(
    { cpu, memory, requestsPerMin, responseTimeSec, historicalCpuRange, resourceType },
    severity
  );

  return ok(res, analysis);
});

export const resolveIncident = asyncHandler(async (req, res) => {
  const incident = await prisma.incident.findUnique({ where: { id: req.params.id } });
  if (!incident) throw new ApiError(404, "Incident not found");

  const updated = await prisma.incident.update({
    where: { id: req.params.id },
    data: { status: "resolved" },
  });

  return ok(res, updated);
});
