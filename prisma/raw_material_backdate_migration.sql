-- Additive migration: lets a raw material withdrawal be recorded for a past date.
--
-- A non-null "backdateReason" marks a late entry — "date" is the day the material actually left
-- the warehouse rack, while "createdAt" (and the generated DO's receiveDate) is the day it was
-- booked in. Existing rows stay NULL, which reads as "recorded on the day", so no backfill is
-- needed and no balance is touched: the warehouse carry-forward math is ordered by "createdAt".

ALTER TABLE "RawMaterialWithdrawal" ADD COLUMN IF NOT EXISTS "backdateReason" TEXT;
