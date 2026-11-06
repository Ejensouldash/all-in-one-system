-- 1. Create Enums if not exist
DO $$ BEGIN
  CREATE TYPE "ProcurementPaymentTerm" AS ENUM (
    'TERM_7_DAYS',
    'TERM_30_DAYS',
    'TERM_60_DAYS',
    'COD',
    'CASH_BEFORE_DELIVERY',
    'CASH'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProcurementInvoiceCategory" AS ENUM (
    'STANDARD_TERMS',
    'MONTHLY_SUBSCRIPTION',
    'CASH_PREPAYMENT'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProcurementInvoiceStatus" AS ENUM (
    'DRAFT',
    'PENDING_FINANCE',
    'IN_REVIEW',
    'PAID',
    'REJECTED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create procurement_suppliers table
CREATE TABLE IF NOT EXISTS "procurement_suppliers" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "terms" "ProcurementPaymentTerm" NOT NULL DEFAULT 'TERM_30_DAYS',
  "remark" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT,

  CONSTRAINT "procurement_suppliers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "procurement_suppliers_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 3. Create procurement_invoices table
CREATE TABLE IF NOT EXISTS "procurement_invoices" (
  "id" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "poNumber" TEXT,
  "company" TEXT NOT NULL,
  "department" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "category" "ProcurementInvoiceCategory" NOT NULL DEFAULT 'STANDARD_TERMS',
  "status" "ProcurementInvoiceStatus" NOT NULL DEFAULT 'PENDING_FINANCE',
  "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueDate" TIMESTAMP(3),
  "submitDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "doReceived" BOOLEAN NOT NULL DEFAULT false,
  "originalInvoiceReceived" BOOLEAN NOT NULL DEFAULT false,
  "attachmentUrl" TEXT,
  "attachmentName" TEXT,
  "paidAt" TIMESTAMP(3),
  "paymentReference" TEXT,
  "paymentReceiptUrl" TEXT,
  "notes" TEXT,
  "createdById" TEXT,
  "paidById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "procurement_invoices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "procurement_invoices_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "procurement_suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "procurement_invoices_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "procurement_invoices_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 4. Create procurement_invoice_logs table
CREATE TABLE IF NOT EXISTS "procurement_invoice_logs" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT,
  "notes" TEXT,
  "performedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "procurement_invoice_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "procurement_invoice_logs_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "procurement_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "procurement_invoice_logs_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 5. Create Indexes
CREATE INDEX IF NOT EXISTS "procurement_invoices_status_idx" ON "procurement_invoices"("status");
CREATE INDEX IF NOT EXISTS "procurement_invoices_category_idx" ON "procurement_invoices"("category");
CREATE INDEX IF NOT EXISTS "procurement_invoices_supplierId_idx" ON "procurement_invoices"("supplierId");
