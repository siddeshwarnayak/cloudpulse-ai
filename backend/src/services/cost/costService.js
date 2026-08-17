import { prisma } from "../../config/prisma.js";
import { recommendCostOptimization } from "../ai/aiService.js";
import { logger } from "../../utils/logger.js";

// Transparent, clearly-simulated monthly base pricing (NOT real AWS billing data).
const SIMULATED_MONTHLY_BASE_COST = {
  ec2: 70,
  rds: 140,
  s3: 25,
};

const CURRENT_SIZE_LABEL = {
  ec2: "m5.large",
  rds: "db.m5.large",
  s3: "STANDARD storage class",
};

/**
 * Called by the anomaly engine when detectIdleWaste() flags sustained
 * low utilization. Produces a Cost row with an AI (or fallback) driven
 * recommendation. All savings are explicitly labeled as *estimated*.
 */
export async function recordIdleWasteOpportunity(resource, idleWaste) {
  const monthlyBaseCost = SIMULATED_MONTHLY_BASE_COST[resource.resourceType] ?? 50;

  const aiInput = {
    resourceType: resource.resourceType,
    currentSize: CURRENT_SIZE_LABEL[resource.resourceType] ?? "unknown",
    utilization: Number(idleWaste.utilization.toFixed(1)),
    runningDurationHours: idleWaste.windowHours,
    monthlyBaseCost,
  };

  const recommendation = await recommendCostOptimization(aiInput);

  try {
    // If latest recommendation for this resource matches the new recommendation,
    // update and reuse it instead of creating a duplicate. This makes generation
    // idempotent and keeps at most one active recommendation per resource in practice.
    const latest = await prisma.cost.findFirst({
      where: { resourceId: resource.id },
      orderBy: { createdAt: "desc" },
    });

    if (latest && JSON.stringify(latest.recommendation) === JSON.stringify(recommendation)) {
      const updated = await prisma.cost.update({
        where: { id: latest.id },
        data: {
          estimatedCost: monthlyBaseCost,
          utilization: aiInput.utilization,
          recommendation,
          // refresh createdAt so this remains the most-recent record
          createdAt: new Date(),
        },
      });
      return updated;
    }

    const cost = await prisma.cost.create({
      data: {
        resourceId: resource.id,
        estimatedCost: monthlyBaseCost,
        utilization: aiInput.utilization,
        recommendation,
      },
    });
    return cost;
  } catch (err) {
    logger.error("Failed to store cost recommendation:", err.message);
    return null;
  }
}

/** Simple current-state cost estimate for the dashboard stat card. */
export async function getEstimatedMonthlyCost() {
  const resources = await prisma.resource.findMany({ where: { status: { not: "stopped" } } });
  const total = resources.reduce((sum, r) => sum + (SIMULATED_MONTHLY_BASE_COST[r.resourceType] ?? 50), 0);
  return { estimatedMonthlyCost: total, resourceCount: resources.length, isSimulated: true };
}

export async function listCostRecommendations(limit = 20) {
  // Return the latest active recommendation per resource (idempotent view).
  // Fetch recent cost rows and reduce to the most recent per resourceId.
  const rows = await prisma.cost.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { resource: true },
  });

  const seen = new Set();
  const unique = [];
  for (const r of rows) {
    if (!seen.has(r.resourceId)) {
      seen.add(r.resourceId);
      unique.push(r);
    }
    if (unique.length >= limit) break;
  }

  return unique;
}
