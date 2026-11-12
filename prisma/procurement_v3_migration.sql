-- Procurement Enhancements V3 Migration
-- Safe additive schema migration

-- 1. Add MONTHLY_SUBSCRIPTION to ProcurementPaymentTerm enum
ALTER TYPE "ProcurementPaymentTerm" ADD VALUE IF NOT EXISTS 'MONTHLY_SUBSCRIPTION';

-- 2. Add company to procurement_suppliers
ALTER TABLE "procurement_suppliers" ADD COLUMN IF NOT EXISTS "company" TEXT;

-- 3. Add poNumber and items to procurement_purchases
ALTER TABLE "procurement_purchases" ADD COLUMN IF NOT EXISTS "poNumber" TEXT;
ALTER TABLE "procurement_purchases" ADD COLUMN IF NOT EXISTS "items" JSONB DEFAULT '[]'::jsonb;

-- 4. Add totalPrice and depositDetails to procurement_invoices
ALTER TABLE "procurement_invoices" ADD COLUMN IF NOT EXISTS "totalPrice" DOUBLE PRECISION;
ALTER TABLE "procurement_invoices" ADD COLUMN IF NOT EXISTS "depositDetails" JSONB;
