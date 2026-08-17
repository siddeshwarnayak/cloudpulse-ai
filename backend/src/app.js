import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";

import authRoutes from "./routes/authRoutes.js";
import resourcesRoutes from "./routes/resourcesRoutes.js";
import metricsRoutes from "./routes/metricsRoutes.js";
import anomaliesRoutes from "./routes/anomaliesRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import costRoutes from "./routes/costRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json());

  app.use("/api/auth", authRoutes);
  app.use("/api/resources", resourcesRoutes);
  app.use("/api/metrics", metricsRoutes);
  app.use("/api/anomalies", anomaliesRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/cost", costRoutes);
  app.use("/api/health", healthRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
