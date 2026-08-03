-- Additive Warehouse Traceability migration for the Supabase PostgreSQL database.
-- This does not alter any Production, DPR, inventory balance, handover, or stock deduction table.

CREATE TABLE IF NOT EXISTS "DistributionTrackingEvent" (
  "id" TEXT NOT NULL,
  "distributionOrderId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "accuracy" DOUBLE PRECISION,
  "locationStatus" TEXT NOT NULL DEFAULT 'UNAVAILABLE',
  "remarks" TEXT,
  "recordedById" TEXT NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DistributionTrackingEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DistributionTrackingEvent_distributionOrderId_fkey"
    FOREIGN KEY ("distributionOrderId") REFERENCES "DistributionOrder"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DistributionTrackingEvent_recordedById_fkey"
    FOREIGN KEY ("recordedById") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "DistributionTrackingEvent_distributionOrderId_recordedAt_idx"
  ON "DistributionTrackingEvent"("distributionOrderId", "recordedAt");

CREATE INDEX IF NOT EXISTS "DistributionTrackingEvent_eventType_recordedAt_idx"
  ON "DistributionTrackingEvent"("eventType", "recordedAt");
