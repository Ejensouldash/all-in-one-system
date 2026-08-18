-- Warehouse Gatepass and returnable wooden-pallet ledger (V1).
-- Additive only: this migration does not alter ProductionTransfer, InventoryBatch,
-- Daily Production Report, raw-material withdrawal, or Production handover tables.

DO $$ BEGIN
  CREATE TYPE "GatePassStatus" AS ENUM (
    'DRAFT', 'AWAITING_CUSTOMER', 'CUSTOMER_SUBMITTED', 'WAREHOUSE_ACKNOWLEDGED',
    'PREPARING', 'READY_FOR_PICKUP', 'CHECKED_IN', 'LOADING', 'CHECKED_OUT',
    'COMPLETED', 'EXPIRED', 'CANCELLED', 'REJECTED', 'NO_SHOW'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "GatePassActorType" AS ENUM ('INTERNAL_USER', 'EXTERNAL_CUSTOMER', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PalletTransferStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PalletMovementType" AS ENUM (
    'OPENING_BALANCE', 'ISSUE_OUT', 'RETURN_IN', 'TRANSFER', 'DAMAGE_RETURN',
    'LOST_WRITE_OFF', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'REVERSAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PalletCondition" AS ENUM ('USABLE', 'DAMAGED', 'LOST');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PalletCustodianKind" AS ENUM (
    'SYSTEM_OPENING', 'WAREHOUSE_USABLE', 'WAREHOUSE_DAMAGED',
    'CUSTOMER', 'TRANSPORTER', 'WRITTEN_OFF'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "WarehouseGatePass" (
  "id" TEXT NOT NULL,
  "gatePassNo" TEXT NOT NULL,
  "status" "GatePassStatus" NOT NULL DEFAULT 'DRAFT',
  "purpose" TEXT NOT NULL,
  "requestedPickupAt" TIMESTAMP(3) NOT NULL,
  "pickupLocation" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "customerContactName" TEXT,
  "customerContactEmail" TEXT,
  "customerContactPhone" TEXT,
  "customerReference" TEXT,
  "plannedPalletQty" INTEGER NOT NULL DEFAULT 0,
  "actualPalletQty" INTEGER,
  "transportCompany" TEXT,
  "driverName" TEXT,
  "driverPhone" TEXT,
  "vehicleNo" TEXT,
  "vehicleType" TEXT,
  "checkedInVehicleNo" TEXT,
  "checkedInDriverName" TEXT,
  "confirmedEta" TIMESTAMP(3),
  "internalRemarks" TEXT,
  "customerRemarks" TEXT,
  "warehouseRemarks" TEXT,
  "securityRemarks" TEXT,
  "cancellationReason" TEXT,
  "rejectionReason" TEXT,
  "createdById" TEXT NOT NULL,
  "customerSubmittedAt" TIMESTAMP(3),
  "warehouseAcknowledgedAt" TIMESTAMP(3),
  "readyAt" TIMESTAMP(3),
  "checkedInAt" TIMESTAMP(3),
  "loadingStartedAt" TIMESTAMP(3),
  "loadingCompletedAt" TIMESTAMP(3),
  "checkedOutAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WarehouseGatePass_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WarehouseGatePass_gatePassNo_key" UNIQUE ("gatePassNo"),
  CONSTRAINT "WarehouseGatePass_createdById_fkey" FOREIGN KEY ("createdById")
    REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "WarehouseGatePass_plannedPalletQty_check" CHECK ("plannedPalletQty" >= 0),
  CONSTRAINT "WarehouseGatePass_actualPalletQty_check" CHECK ("actualPalletQty" IS NULL OR "actualPalletQty" >= 0)
);

CREATE TABLE IF NOT EXISTS "WarehouseGatePassItem" (
  "id" TEXT NOT NULL,
  "gatePassId" TEXT NOT NULL,
  "sku" TEXT,
  "description" TEXT NOT NULL,
  "uom" TEXT NOT NULL DEFAULT 'BOX',
  "plannedQty" INTEGER NOT NULL,
  "actualQty" INTEGER,
  "varianceReason" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "WarehouseGatePassItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WarehouseGatePassItem_gatePassId_fkey" FOREIGN KEY ("gatePassId")
    REFERENCES "WarehouseGatePass"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WarehouseGatePassItem_plannedQty_check" CHECK ("plannedQty" > 0),
  CONSTRAINT "WarehouseGatePassItem_actualQty_check" CHECK ("actualQty" IS NULL OR "actualQty" >= 0)
);

CREATE TABLE IF NOT EXISTS "GatePassExternalToken" (
  "id" TEXT NOT NULL,
  "gatePassId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GatePassExternalToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GatePassExternalToken_tokenHash_key" UNIQUE ("tokenHash"),
  CONSTRAINT "GatePassExternalToken_gatePassId_fkey" FOREIGN KEY ("gatePassId")
    REFERENCES "WarehouseGatePass"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "GatePassVerificationToken" (
  "id" TEXT NOT NULL,
  "gatePassId" TEXT NOT NULL,
  "publicCode" TEXT NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GatePassVerificationToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GatePassVerificationToken_publicCode_key" UNIQUE ("publicCode"),
  CONSTRAINT "GatePassVerificationToken_gatePassId_fkey" FOREIGN KEY ("gatePassId")
    REFERENCES "WarehouseGatePass"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "GatePassStatusEvent" (
  "id" TEXT NOT NULL,
  "gatePassId" TEXT NOT NULL,
  "fromStatus" "GatePassStatus",
  "toStatus" "GatePassStatus" NOT NULL,
  "actorType" "GatePassActorType" NOT NULL,
  "actorUserId" TEXT,
  "actorLabel" TEXT,
  "remarks" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GatePassStatusEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GatePassStatusEvent_gatePassId_fkey" FOREIGN KEY ("gatePassId")
    REFERENCES "WarehouseGatePass"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GatePassStatusEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId")
    REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "GatePassDeliveryOrder" (
  "gatePassId" TEXT NOT NULL,
  "distributionOrderId" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "linkedById" TEXT NOT NULL,
  "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GatePassDeliveryOrder_pkey" PRIMARY KEY ("gatePassId", "distributionOrderId"),
  CONSTRAINT "GatePassDeliveryOrder_gatePassId_fkey" FOREIGN KEY ("gatePassId")
    REFERENCES "WarehouseGatePass"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GatePassDeliveryOrder_distributionOrderId_fkey" FOREIGN KEY ("distributionOrderId")
    REFERENCES "DistributionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "GatePassDeliveryOrder_linkedById_fkey" FOREIGN KEY ("linkedById")
    REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "PalletType" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "material" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PalletType_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PalletType_code_key" UNIQUE ("code")
);

CREATE TABLE IF NOT EXISTS "PalletCustodian" (
  "id" TEXT NOT NULL,
  "kind" "PalletCustodianKind" NOT NULL,
  "name" TEXT NOT NULL,
  "externalReference" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PalletCustodian_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PalletCustodian_kind_name_key" UNIQUE ("kind", "name")
);

CREATE TABLE IF NOT EXISTS "PalletTransfer" (
  "id" TEXT NOT NULL,
  "transferNo" TEXT NOT NULL,
  "status" "PalletTransferStatus" NOT NULL DEFAULT 'DRAFT',
  "movementType" "PalletMovementType" NOT NULL,
  "gatePassId" TEXT,
  "distributionOrderId" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "fromCustodianId" TEXT NOT NULL,
  "toCustodianId" TEXT NOT NULL,
  "transportCompany" TEXT,
  "driverName" TEXT,
  "vehicleNo" TEXT,
  "remarks" TEXT,
  "evidenceUrl" TEXT,
  "releasedSignature" TEXT,
  "receivedByName" TEXT,
  "receivedSignature" TEXT,
  "verifiedSignature" TEXT,
  "createdById" TEXT NOT NULL,
  "verifiedById" TEXT,
  "postedById" TEXT,
  "postedAt" TIMESTAMP(3),
  "reversedById" TEXT,
  "reversedAt" TIMESTAMP(3),
  "reversalReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PalletTransfer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PalletTransfer_transferNo_key" UNIQUE ("transferNo"),
  CONSTRAINT "PalletTransfer_gatePassId_fkey" FOREIGN KEY ("gatePassId")
    REFERENCES "WarehouseGatePass"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "PalletTransfer_distributionOrderId_fkey" FOREIGN KEY ("distributionOrderId")
    REFERENCES "DistributionOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "PalletTransfer_fromCustodianId_fkey" FOREIGN KEY ("fromCustodianId")
    REFERENCES "PalletCustodian"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PalletTransfer_toCustodianId_fkey" FOREIGN KEY ("toCustodianId")
    REFERENCES "PalletCustodian"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PalletTransfer_createdById_fkey" FOREIGN KEY ("createdById")
    REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PalletTransfer_verifiedById_fkey" FOREIGN KEY ("verifiedById")
    REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "PalletTransfer_postedById_fkey" FOREIGN KEY ("postedById")
    REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "PalletTransfer_reversedById_fkey" FOREIGN KEY ("reversedById")
    REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "PalletTransfer_distinctCustodian_check" CHECK ("fromCustodianId" <> "toCustodianId")
);

CREATE TABLE IF NOT EXISTS "PalletTransferLine" (
  "id" TEXT NOT NULL,
  "transferId" TEXT NOT NULL,
  "palletTypeId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "fromCondition" "PalletCondition" NOT NULL DEFAULT 'USABLE',
  "toCondition" "PalletCondition" NOT NULL DEFAULT 'USABLE',
  "remarks" TEXT,
  CONSTRAINT "PalletTransferLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PalletTransferLine_transferId_fkey" FOREIGN KEY ("transferId")
    REFERENCES "PalletTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PalletTransferLine_palletTypeId_fkey" FOREIGN KEY ("palletTypeId")
    REFERENCES "PalletType"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PalletTransferLine_quantity_check" CHECK ("quantity" > 0)
);

CREATE TABLE IF NOT EXISTS "PalletMovement" (
  "id" TEXT NOT NULL,
  "transferId" TEXT NOT NULL,
  "transferLineId" TEXT NOT NULL,
  "palletTypeId" TEXT NOT NULL,
  "movementType" "PalletMovementType" NOT NULL,
  "fromCustodianId" TEXT NOT NULL,
  "toCustodianId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "reversesMovementId" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PalletMovement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PalletMovement_transferId_fkey" FOREIGN KEY ("transferId")
    REFERENCES "PalletTransfer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PalletMovement_transferLineId_fkey" FOREIGN KEY ("transferLineId")
    REFERENCES "PalletTransferLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PalletMovement_palletTypeId_fkey" FOREIGN KEY ("palletTypeId")
    REFERENCES "PalletType"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PalletMovement_fromCustodianId_fkey" FOREIGN KEY ("fromCustodianId")
    REFERENCES "PalletCustodian"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PalletMovement_toCustodianId_fkey" FOREIGN KEY ("toCustodianId")
    REFERENCES "PalletCustodian"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PalletMovement_reversesMovementId_fkey" FOREIGN KEY ("reversesMovementId")
    REFERENCES "PalletMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "PalletMovement_createdById_fkey" FOREIGN KEY ("createdById")
    REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "PalletMovement_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "PalletMovement_distinctCustodian_check" CHECK ("fromCustodianId" <> "toCustodianId")
);

CREATE INDEX IF NOT EXISTS "WarehouseGatePass_status_requestedPickupAt_idx" ON "WarehouseGatePass"("status", "requestedPickupAt");
CREATE INDEX IF NOT EXISTS "WarehouseGatePass_customerName_idx" ON "WarehouseGatePass"("customerName");
CREATE INDEX IF NOT EXISTS "WarehouseGatePass_vehicleNo_idx" ON "WarehouseGatePass"("vehicleNo");
CREATE INDEX IF NOT EXISTS "WarehouseGatePass_createdById_createdAt_idx" ON "WarehouseGatePass"("createdById", "createdAt");
CREATE INDEX IF NOT EXISTS "WarehouseGatePassItem_gatePassId_sortOrder_idx" ON "WarehouseGatePassItem"("gatePassId", "sortOrder");
CREATE INDEX IF NOT EXISTS "GatePassExternalToken_gatePassId_createdAt_idx" ON "GatePassExternalToken"("gatePassId", "createdAt");
CREATE INDEX IF NOT EXISTS "GatePassExternalToken_expiresAt_idx" ON "GatePassExternalToken"("expiresAt");
CREATE INDEX IF NOT EXISTS "GatePassVerificationToken_gatePassId_createdAt_idx" ON "GatePassVerificationToken"("gatePassId", "createdAt");
CREATE INDEX IF NOT EXISTS "GatePassStatusEvent_gatePassId_occurredAt_idx" ON "GatePassStatusEvent"("gatePassId", "occurredAt");
CREATE INDEX IF NOT EXISTS "GatePassStatusEvent_actorUserId_idx" ON "GatePassStatusEvent"("actorUserId");
CREATE INDEX IF NOT EXISTS "GatePassDeliveryOrder_distributionOrderId_idx" ON "GatePassDeliveryOrder"("distributionOrderId");
CREATE INDEX IF NOT EXISTS "GatePassDeliveryOrder_linkedById_idx" ON "GatePassDeliveryOrder"("linkedById");
CREATE INDEX IF NOT EXISTS "PalletCustodian_kind_active_idx" ON "PalletCustodian"("kind", "active");
CREATE INDEX IF NOT EXISTS "PalletTransfer_status_occurredAt_idx" ON "PalletTransfer"("status", "occurredAt");
CREATE INDEX IF NOT EXISTS "PalletTransfer_gatePassId_idx" ON "PalletTransfer"("gatePassId");
CREATE INDEX IF NOT EXISTS "PalletTransfer_distributionOrderId_idx" ON "PalletTransfer"("distributionOrderId");
CREATE INDEX IF NOT EXISTS "PalletTransfer_fromCustodianId_idx" ON "PalletTransfer"("fromCustodianId");
CREATE INDEX IF NOT EXISTS "PalletTransfer_toCustodianId_idx" ON "PalletTransfer"("toCustodianId");
CREATE INDEX IF NOT EXISTS "PalletTransferLine_transferId_idx" ON "PalletTransferLine"("transferId");
CREATE INDEX IF NOT EXISTS "PalletTransferLine_palletTypeId_idx" ON "PalletTransferLine"("palletTypeId");
CREATE INDEX IF NOT EXISTS "PalletMovement_transferId_idx" ON "PalletMovement"("transferId");
CREATE INDEX IF NOT EXISTS "PalletMovement_palletTypeId_createdAt_idx" ON "PalletMovement"("palletTypeId", "createdAt");
CREATE INDEX IF NOT EXISTS "PalletMovement_fromCustodianId_palletTypeId_idx" ON "PalletMovement"("fromCustodianId", "palletTypeId");
CREATE INDEX IF NOT EXISTS "PalletMovement_toCustodianId_palletTypeId_idx" ON "PalletMovement"("toCustodianId", "palletTypeId");
CREATE INDEX IF NOT EXISTS "PalletMovement_reversesMovementId_idx" ON "PalletMovement"("reversesMovementId");

INSERT INTO "PalletType" ("id", "code", "name", "material", "active", "createdAt", "updatedAt")
VALUES ('00000000-0000-4000-8000-000000000101', 'WOODEN_STANDARD', 'Standard Wooden Pallet', 'WOOD', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "PalletCustodian" ("id", "kind", "name", "active", "createdAt", "updatedAt") VALUES
  ('00000000-0000-4000-8000-000000000201', 'SYSTEM_OPENING', 'System Opening Balance', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000000202', 'WAREHOUSE_USABLE', 'Warehouse - Usable Pallets', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000000203', 'WAREHOUSE_DAMAGED', 'Warehouse - Damaged Pallets', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('00000000-0000-4000-8000-000000000204', 'WRITTEN_OFF', 'Written Off / Lost', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("kind", "name") DO NOTHING;
