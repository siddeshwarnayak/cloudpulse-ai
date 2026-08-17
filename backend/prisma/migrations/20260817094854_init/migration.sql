-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('ec2', 's3', 'rds');

-- CreateEnum
CREATE TYPE "ResourceStatus" AS ENUM ('running', 'stopped', 'degraded');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "AnomalyType" AS ENUM ('cpu', 'memory', 'traffic', 'responseTime', 'idle');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('open', 'resolved');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceType" "ResourceType" NOT NULL,
    "region" TEXT NOT NULL,
    "status" "ResourceStatus" NOT NULL DEFAULT 'running',
    "configuration" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metrics" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "cpu" DOUBLE PRECISION,
    "memory" DOUBLE PRECISION,
    "network" DOUBLE PRECISION NOT NULL,
    "responseTime" DOUBLE PRECISION NOT NULL,
    "requestCount" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "anomalyType" "AnomalyType" NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "aiAnalysis" TEXT,
    "recommendation" JSONB,
    "status" "IncidentStatus" NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "costs" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "estimatedCost" DOUBLE PRECISION NOT NULL,
    "utilization" DOUBLE PRECISION NOT NULL,
    "recommendation" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "costs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "resources_resourceId_key" ON "resources"("resourceId");

-- CreateIndex
CREATE INDEX "resources_resourceType_idx" ON "resources"("resourceType");

-- CreateIndex
CREATE INDEX "metrics_resourceId_idx" ON "metrics"("resourceId");

-- CreateIndex
CREATE INDEX "metrics_timestamp_idx" ON "metrics"("timestamp");

-- CreateIndex
CREATE INDEX "metrics_resourceId_timestamp_idx" ON "metrics"("resourceId", "timestamp");

-- CreateIndex
CREATE INDEX "incidents_resourceId_idx" ON "incidents"("resourceId");

-- CreateIndex
CREATE INDEX "incidents_detectedAt_idx" ON "incidents"("detectedAt");

-- CreateIndex
CREATE INDEX "incidents_resourceId_anomalyType_status_idx" ON "incidents"("resourceId", "anomalyType", "status");

-- CreateIndex
CREATE INDEX "costs_resourceId_idx" ON "costs"("resourceId");

-- CreateIndex
CREATE INDEX "costs_createdAt_idx" ON "costs"("createdAt");

-- AddForeignKey
ALTER TABLE "metrics" ADD CONSTRAINT "metrics_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "costs" ADD CONSTRAINT "costs_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
