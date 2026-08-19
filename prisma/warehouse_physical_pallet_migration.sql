-- QR-tracked physical pallets and exclusive DO-to-Gatepass relationship.
CREATE TYPE "PhysicalPalletStatus" AS ENUM ('IN_WAREHOUSE', 'WITH_CUSTOMER', 'RETURNED', 'DAMAGED', 'LOST');

CREATE TABLE "PhysicalPallet" (
  "id" TEXT NOT NULL,
  "palletCode" TEXT NOT NULL,
  "palletTypeId" TEXT NOT NULL,
  "status" "PhysicalPalletStatus" NOT NULL DEFAULT 'IN_WAREHOUSE',
  "condition" "PalletCondition" NOT NULL DEFAULT 'USABLE',
  "currentCustodianId" TEXT,
  "currentGatePassId" TEXT,
  "currentDOId" TEXT,
  "lastMovedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PhysicalPallet_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PhysicalPallet_palletCode_key" UNIQUE ("palletCode"),
  CONSTRAINT "PhysicalPallet_palletTypeId_fkey" FOREIGN KEY ("palletTypeId") REFERENCES "PalletType"("id") ON DELETE RESTRICT,
  CONSTRAINT "PhysicalPallet_currentCustodianId_fkey" FOREIGN KEY ("currentCustodianId") REFERENCES "PalletCustodian"("id") ON DELETE SET NULL,
  CONSTRAINT "PhysicalPallet_currentGatePassId_fkey" FOREIGN KEY ("currentGatePassId") REFERENCES "WarehouseGatePass"("id") ON DELETE SET NULL,
  CONSTRAINT "PhysicalPallet_currentDOId_fkey" FOREIGN KEY ("currentDOId") REFERENCES "DistributionOrder"("id") ON DELETE SET NULL
);

CREATE TABLE "PhysicalPalletEvent" (
  "id" TEXT NOT NULL,
  "physicalPalletId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "fromCustodianId" TEXT,
  "toCustodianId" TEXT,
  "gatePassId" TEXT,
  "distributionOrderId" TEXT,
  "remarks" TEXT,
  "recordedById" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PhysicalPalletEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PhysicalPalletEvent_physicalPalletId_fkey" FOREIGN KEY ("physicalPalletId") REFERENCES "PhysicalPallet"("id") ON DELETE CASCADE,
  CONSTRAINT "PhysicalPalletEvent_fromCustodianId_fkey" FOREIGN KEY ("fromCustodianId") REFERENCES "PalletCustodian"("id") ON DELETE SET NULL,
  CONSTRAINT "PhysicalPalletEvent_toCustodianId_fkey" FOREIGN KEY ("toCustodianId") REFERENCES "PalletCustodian"("id") ON DELETE SET NULL,
  CONSTRAINT "PhysicalPalletEvent_gatePassId_fkey" FOREIGN KEY ("gatePassId") REFERENCES "WarehouseGatePass"("id") ON DELETE SET NULL,
  CONSTRAINT "PhysicalPalletEvent_distributionOrderId_fkey" FOREIGN KEY ("distributionOrderId") REFERENCES "DistributionOrder"("id") ON DELETE SET NULL,
  CONSTRAINT "PhysicalPalletEvent_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT
);

CREATE INDEX "PhysicalPallet_status_currentCustodianId_idx" ON "PhysicalPallet"("status", "currentCustodianId");
CREATE INDEX "PhysicalPalletEvent_physicalPalletId_occurredAt_idx" ON "PhysicalPalletEvent"("physicalPalletId", "occurredAt");

-- This will fail cleanly if historic data has a DO linked to more than one Gatepass;
-- resolve those records deliberately before applying the constraint.
ALTER TABLE "GatePassDeliveryOrder" ADD CONSTRAINT "GatePassDeliveryOrder_distributionOrderId_key" UNIQUE ("distributionOrderId");
