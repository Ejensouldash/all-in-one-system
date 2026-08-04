-- Additive Sales Ordering + AI intake migration.
-- Deliberately does not alter Production, InventoryBatch, DistributionOrder, or Warehouse formulas.

CREATE TABLE IF NOT EXISTS "Customer" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "customerCode" TEXT NOT NULL,
  "sageCustomerId" TEXT,
  "legalName" TEXT NOT NULL,
  "tradingName" TEXT,
  "pic" TEXT,
  "email" TEXT,
  "phonePrimary" TEXT,
  "phoneSecondary" TEXT,
  "customerType" TEXT,
  "customerSubtype" TEXT,
  "categoryCode" TEXT,
  "zone" TEXT,
  "region" TEXT,
  "creditTermsRaw" TEXT,
  "creditTermDays" INTEGER,
  "paymentPolicy" TEXT,
  "salesRep1" TEXT,
  "salesRep2" TEXT,
  "companyRegistrationNo" TEXT,
  "tinNo" TEXT,
  "sstNo" TEXT,
  "importStatus" TEXT NOT NULL DEFAULT 'READY',
  "sourceData" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Customer_customerCode_key" ON "Customer"("customerCode");
CREATE INDEX IF NOT EXISTS "Customer_sageCustomerId_idx" ON "Customer"("sageCustomerId");
CREATE INDEX IF NOT EXISTS "Customer_legalName_idx" ON "Customer"("legalName");
CREATE INDEX IF NOT EXISTS "Customer_customerType_customerSubtype_idx" ON "Customer"("customerType", "customerSubtype");
CREATE INDEX IF NOT EXISTS "Customer_zone_idx" ON "Customer"("zone");

CREATE TABLE IF NOT EXISTS "CustomerAddress" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "customerId" TEXT NOT NULL,
  "addressType" TEXT NOT NULL DEFAULT 'BILLING',
  "label" TEXT NOT NULL DEFAULT 'Master Address',
  "attentionTo" TEXT,
  "phone" TEXT,
  "addressLine1" TEXT,
  "addressLine2" TEXT,
  "addressLine3" TEXT,
  "city" TEXT,
  "state" TEXT,
  "postcode" TEXT,
  "country" TEXT,
  "fullAddress" TEXT,
  "isDefaultBilling" BOOLEAN NOT NULL DEFAULT true,
  "isDefaultDelivery" BOOLEAN NOT NULL DEFAULT false,
  "sourceRowReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CustomerAddress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerAddress_customerId_label_key" ON "CustomerAddress"("customerId", "label");
CREATE INDEX IF NOT EXISTS "CustomerAddress_customerId_addressType_idx" ON "CustomerAddress"("customerId", "addressType");

CREATE TABLE IF NOT EXISTS "SalesDocumentIntake" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "fileName" TEXT NOT NULL,
  "r2ObjectKey" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "fileHash" TEXT,
  "status" TEXT NOT NULL DEFAULT 'UPLOADED',
  "documentType" TEXT,
  "extractedData" JSONB,
  "validationIssues" JSONB,
  "aiModel" TEXT,
  "aiProcessedAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "matchedCustomerId" TEXT,
  "uploadedById" TEXT NOT NULL,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalesDocumentIntake_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SalesDocumentIntake_matchedCustomerId_fkey" FOREIGN KEY ("matchedCustomerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "SalesDocumentIntake_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SalesDocumentIntake_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "SalesDocumentIntake_r2ObjectKey_key" ON "SalesDocumentIntake"("r2ObjectKey");
CREATE INDEX IF NOT EXISTS "SalesDocumentIntake_status_createdAt_idx" ON "SalesDocumentIntake"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "SalesDocumentIntake_matchedCustomerId_idx" ON "SalesDocumentIntake"("matchedCustomerId");
CREATE INDEX IF NOT EXISTS "SalesDocumentIntake_fileHash_idx" ON "SalesDocumentIntake"("fileHash");

CREATE TABLE IF NOT EXISTS "SalesOrder" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "internalSoNo" TEXT NOT NULL,
  "sageSalesOrderNo" TEXT,
  "sourceDocumentId" TEXT,
  "customerId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "documentType" TEXT,
  "customerDocumentNo" TEXT,
  "poNumber" TEXT,
  "orderDate" DATE,
  "requestedDeliveryDate" DATE,
  "paymentTermsSnapshot" TEXT,
  "billingAddressSnapshot" JSONB,
  "deliveryAddressSnapshot" JSONB,
  "deliveryContactSnapshot" TEXT,
  "deliveryPhoneSnapshot" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'MYR',
  "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "discountTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "freightTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "taxTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "grandTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "orderRemarks" TEXT,
  "createdById" TEXT NOT NULL,
  "submittedToWarehouseAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SalesOrder_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "SalesDocumentIntake"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "SalesOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SalesOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "SalesOrder_internalSoNo_key" ON "SalesOrder"("internalSoNo");
CREATE UNIQUE INDEX IF NOT EXISTS "SalesOrder_sourceDocumentId_key" ON "SalesOrder"("sourceDocumentId");
CREATE INDEX IF NOT EXISTS "SalesOrder_customerId_createdAt_idx" ON "SalesOrder"("customerId", "createdAt");
CREATE INDEX IF NOT EXISTS "SalesOrder_status_createdAt_idx" ON "SalesOrder"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "SalesOrder_poNumber_idx" ON "SalesOrder"("poNumber");

CREATE TABLE IF NOT EXISTS "SalesOrderLineItem" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "salesOrderId" TEXT NOT NULL,
  "sku" TEXT,
  "itemCodeSnapshot" TEXT,
  "barcodeSnapshot" TEXT,
  "descriptionSnapshot" TEXT NOT NULL,
  "uom" TEXT NOT NULL DEFAULT 'CTN',
  "qtyOrdered" DECIMAL(14,3) NOT NULL,
  "qtyAllocated" DECIMAL(14,3) NOT NULL DEFAULT 0,
  "qtyDelivered" DECIMAL(14,3) NOT NULL DEFAULT 0,
  "unitPrice" DECIMAL(14,4) NOT NULL DEFAULT 0,
  "discountAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "taxAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "lineTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "isServiceCharge" BOOLEAN NOT NULL DEFAULT false,
  "remarks" TEXT,
  CONSTRAINT "SalesOrderLineItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SalesOrderLineItem_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "SalesOrderLineItem_salesOrderId_idx" ON "SalesOrderLineItem"("salesOrderId");
CREATE INDEX IF NOT EXISTS "SalesOrderLineItem_sku_idx" ON "SalesOrderLineItem"("sku");
