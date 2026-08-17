import { PrismaClient } from "../generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { logger } from "../utils/logger.js";

// Singleton Prisma client. In dev with --watch, avoid creating multiple
// connections across hot reloads by stashing the instance on globalThis.
const globalForPrisma = globalThis;

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

export const prisma =
  globalForPrisma.__cloudpulsePrisma ??
  new PrismaClient({
    adapter,
    log: [
      { level: "warn", emit: "event" },
      { level: "error", emit: "event" },
    ],
  });

prisma.$on?.("warn", (e) => logger.warn("[prisma]", e.message));
prisma.$on?.("error", (e) => logger.error("[prisma]", e.message));

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__cloudpulsePrisma = prisma;
}
