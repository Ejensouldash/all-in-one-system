-- Provenance for event feedback responses.
-- PUBLIC_FORM = submitted by a respondent through the public QR/feedback link.
-- EXCEL_IMPORT = backfilled from an event's external (e.g. Google Forms) satisfaction sheet.
-- Additive and idempotent: existing rows default to PUBLIC_FORM.

ALTER TABLE "MarketingEventFeedback"
ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'PUBLIC_FORM';
