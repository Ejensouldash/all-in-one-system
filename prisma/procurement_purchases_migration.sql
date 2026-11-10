-- Create procurement_purchases table
CREATE TABLE IF NOT EXISTS "procurement_purchases" (
  "id" TEXT NOT NULL,
  "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "itemDescription" TEXT NOT NULL,
  "supplierId" TEXT,
  "supplierName" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "uom" TEXT NOT NULL,
  "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "company" TEXT NOT NULL,
  "department" TEXT,
  "remarks" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "procurement_purchases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "procurement_purchases_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "procurement_suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "procurement_purchases_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "procurement_purchases_company_idx" ON "procurement_purchases"("company");
CREATE INDEX IF NOT EXISTS "procurement_purchases_department_idx" ON "procurement_purchases"("department");
CREATE INDEX IF NOT EXISTS "procurement_purchases_purchaseDate_idx" ON "procurement_purchases"("purchaseDate");
CREATE INDEX IF NOT EXISTS "procurement_purchases_supplierId_idx" ON "procurement_purchases"("supplierId");
