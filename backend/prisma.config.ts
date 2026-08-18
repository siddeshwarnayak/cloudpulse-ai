// Prisma 7 configuration.
//
// In Prisma 7, connection configuration and CLI behavior are driven from
// this file instead of being hard-coded in schema.prisma. schema.prisma
// only declares the *shape* of the datasource (provider) and models;
// the actual URL is resolved here from environment variables so it can
// differ between dev/test/prod without touching the schema.
//
// NOTE: Prisma 7 is a fast-moving/early release at the time this project
// was generated. If `npx prisma generate` reports that an option here is
// deprecated or renamed, check `npx prisma --version` and the installed
// package's changelog and adjust field names accordingly - the shape of
// this file (schema path, migrations path, datasource url resolution)
// is what matters, not the exact literal API surface.

import "dotenv/config";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    // Use the Prisma env helper so CLI commands (including `prisma migrate deploy`)
    // can resolve the URL from the environment in Render and other CI/CD hosts.
    url: env("DATABASE_URL"),
  },
});
