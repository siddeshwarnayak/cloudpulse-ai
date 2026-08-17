import { prisma } from "../config/prisma.js";
import { logger } from "./logger.js";

const SEED_RESOURCES = [
  { resourceId: "ec2-app-server-01", resourceType: "ec2", region: "us-east-1", configuration: { instanceType: "m5.large", role: "application" } },
  { resourceId: "ec2-api-server-01", resourceType: "ec2", region: "us-east-1", configuration: { instanceType: "m5.large", role: "api" } },
  { resourceId: "ec2-worker-server-01", resourceType: "ec2", region: "us-west-2", configuration: { instanceType: "m5.xlarge", role: "worker" } },
  { resourceId: "rds-postgres-primary", resourceType: "rds", region: "us-east-1", configuration: { engine: "postgres", instanceClass: "db.m5.large" } },
  { resourceId: "s3-app-storage-bucket", resourceType: "s3", region: "us-east-1", configuration: { storageClass: "STANDARD" } },
];

export async function seedResources() {
  const results = [];
  for (const resource of SEED_RESOURCES) {
    // upsert on the unique resourceId keeps seeding idempotent across
    // repeated runs / restarts.
    const record = await prisma.resource.upsert({
      where: { resourceId: resource.resourceId },
      update: {},
      create: {
        resourceId: resource.resourceId,
        resourceType: resource.resourceType,
        region: resource.region,
        status: "running",
        configuration: resource.configuration,
      },
    });
    results.push(record);
  }
  logger.info(`Seed complete. ${results.length} resources present.`);
  return results;
}

// Allow running directly: `node src/utils/seed.js`
if (import.meta.url === `file://${process.argv[1]}`) {
  seedResources()
    .then(() => prisma.$disconnect())
    .catch(async (err) => {
      logger.error("Seeding failed:", err);
      await prisma.$disconnect();
      process.exit(1);
    });
}
