-- Move the QC DO reference to the Daily Raw Material report header.
-- The legacy item column is intentionally retained for a safe, backward-compatible rollout.
ALTER TABLE "WarehouseRawMaterialReport"
ADD COLUMN IF NOT EXISTS "referenceDoNumber" TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'WarehouseRawMaterialItem'
      AND column_name = 'referenceDoNumber'
  ) THEN
    EXECUTE $sql$
      UPDATE "WarehouseRawMaterialReport" AS report
      SET "referenceDoNumber" = legacy."referenceDoNumber"
      FROM (
        SELECT "reportId", string_agg(DISTINCT "referenceDoNumber", ', ') AS "referenceDoNumber"
        FROM "WarehouseRawMaterialItem"
        WHERE NULLIF(BTRIM("referenceDoNumber"), '') IS NOT NULL
        GROUP BY "reportId"
      ) AS legacy
      WHERE report.id = legacy."reportId"
        AND NULLIF(BTRIM(report."referenceDoNumber"), '') IS NULL
    $sql$;
  END IF;
END $$;
