import { createApp } from "./app.js";
import { env, isAiEnabled } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { logger } from "./utils/logger.js";
import { seedResources } from "./utils/seed.js";
import { startSimulator, stopSimulator } from "./services/simulation/simulator.js";

async function main() {
  const app = createApp();

  // Verify DB connectivity up front, but don't hard-crash the process if
  // it's briefly unavailable - the API will still respond (health check
  // will report dbConnected: false) so the frontend can show a clear
  // "backend/database unavailable" state instead of nothing at all.
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info("Database connection OK.");
    await seedResources();
    startSimulator();
  } catch (err) {
    logger.error(
      "Could not connect to the database at startup. The API will still start, " +
        "but simulation and most endpoints will fail until PostgreSQL is reachable.",
      err.message
    );
  }

  if (!isAiEnabled()) {
    logger.warn(
      "ANTHROPIC_API_KEY is not set. AI analysis will use rule-based fallback responses. " +
        "Add it to backend/.env to enable live AI insights."
    );
  }

  const server = app.listen(env.PORT, () => {
    logger.info(`CloudPulse AI backend listening on http://localhost:${env.PORT}`);
  });

  const shutdown = async (signal) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    stopSimulator();
    server.close(async () => {
      await prisma.$disconnect();
      logger.info("Shutdown complete.");
      process.exit(0);
    });
    // Force-exit if graceful shutdown hangs
    setTimeout(() => process.exit(1), 5000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error("Fatal startup error:", err);
  process.exit(1);
});
