-- Procurement Enhancements V4 Migration
-- Add quotationReceived to procurement_invoices
ALTER TABLE "procurement_invoices" ADD COLUMN IF NOT EXISTS "quotationReceived" BOOLEAN DEFAULT false;
