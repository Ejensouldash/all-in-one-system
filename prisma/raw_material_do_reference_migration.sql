-- QC reference entered per Daily Raw Material row.
-- Informational only: it does not replace or affect the system-generated TransferIn DO.
ALTER TABLE "WarehouseRawMaterialItem"
ADD COLUMN IF NOT EXISTS "referenceDoNumber" TEXT;
