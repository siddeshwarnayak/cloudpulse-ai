import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { isAiEnabled } from "../config/env.js";
import { isSimulatorRunning } from "../services/simulation/simulator.js";
import { ok } from "../utils/apiResponse.js";

const router = Router();

router.get("/", async (req, res) => {
  let dbConnected = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbConnected = true;
  } catch {
    dbConnected = false;
  }

  return ok(res, {
    status: "ok",
    dbConnected,
    aiEnabled: isAiEnabled(),
    simulatorRunning: isSimulatorRunning(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
