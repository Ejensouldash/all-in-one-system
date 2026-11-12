-- Safe Additive Migration for Procurement Module Enhancements
-- 1. Add contactPerson, branch, and department to procurement_suppliers
ALTER TABLE "procurement_suppliers" ADD COLUMN IF NOT EXISTS "contactPerson" TEXT;
ALTER TABLE "procurement_suppliers" ADD COLUMN IF NOT EXISTS "branch" TEXT;
ALTER TABLE "procurement_suppliers" ADD COLUMN IF NOT EXISTS "department" TEXT;

-- 2. Add attachments JSONB column to procurement_invoices
ALTER TABLE "procurement_invoices" ADD COLUMN IF NOT EXISTS "attachments" JSONB DEFAULT '[]'::jsonb;
-- Add DEPOSIT_PAYMENT enum value
ALTER TYPE "ProcurementInvoiceCategory" ADD VALUE IF NOT EXISTS 'DEPOSIT_PAYMENT';

-- Add proformaInvoiceReceived and pdfReceived columns
ALTER TABLE "procurement_invoices" ADD COLUMN IF NOT EXISTS "proformaInvoiceReceived" BOOLEAN DEFAULT false;
ALTER TABLE "procurement_invoices" ADD COLUMN IF NOT EXISTS "pdfReceived" BOOLEAN DEFAULT false;
