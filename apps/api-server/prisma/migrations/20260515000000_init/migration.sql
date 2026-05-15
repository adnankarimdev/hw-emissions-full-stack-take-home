-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('WITHIN_LIMIT', 'LIMIT_EXCEEDED');

-- CreateEnum
CREATE TYPE "OutboxEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');

-- CreateTable
CREATE TABLE "sites" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "emission_limit" DECIMAL(18,6) NOT NULL,
    "total_emissions_to_date" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingest_batches" (
    "id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "readings_count" INTEGER NOT NULL,
    "emissions_total" DECIMAL(18,6) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingest_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "measurements" (
    "id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "source_id" TEXT NOT NULL,
    "measured_at" TIMESTAMP(3) NOT NULL,
    "methane_kg" DECIMAL(18,6) NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxEventStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3),
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ingest_batches_site_id_idx" ON "ingest_batches"("site_id");

-- CreateIndex
CREATE UNIQUE INDEX "ingest_batches_site_id_idempotency_key_key" ON "ingest_batches"("site_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "measurements_site_id_measured_at_idx" ON "measurements"("site_id", "measured_at");

-- CreateIndex
CREATE INDEX "measurements_batch_id_idx" ON "measurements"("batch_id");

-- CreateIndex
CREATE INDEX "outbox_events_status_created_at_idx" ON "outbox_events"("status", "created_at");

-- AddForeignKey
ALTER TABLE "ingest_batches" ADD CONSTRAINT "ingest_batches_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "ingest_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
