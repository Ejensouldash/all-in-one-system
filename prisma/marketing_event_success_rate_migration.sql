-- Weighted Event Success Rate (Post-Event Report) schema migration.
-- Safe to re-run: every statement is idempotent.

-- 1. Budget cap (Finance / HOD) used by the 15% budget component.
ALTER TABLE "MarketingEventRequisition" ADD COLUMN IF NOT EXISTS "budgetCap" DOUBLE PRECISION;
ALTER TABLE "MarketingEventRequisition" ADD COLUMN IF NOT EXISTS "categoryBudgets" TEXT DEFAULT '{}';
ALTER TABLE "MarketingEventRequisition" ADD COLUMN IF NOT EXISTS "budgetSetBy" TEXT;
ALTER TABLE "MarketingEventRequisition" ADD COLUMN IF NOT EXISTS "budgetSetAt" TIMESTAMP(3);

-- 2. Gemini sentiment cache for the 15% participants' feedback component.
ALTER TABLE "MarketingEventFeedback" ADD COLUMN IF NOT EXISTS "aiSentiment" TEXT;
ALTER TABLE "MarketingEventFeedback" ADD COLUMN IF NOT EXISTS "aiConfidence" DOUBLE PRECISION;
ALTER TABLE "MarketingEventFeedback" ADD COLUMN IF NOT EXISTS "aiReason" TEXT;
ALTER TABLE "MarketingEventFeedback" ADD COLUMN IF NOT EXISTS "aiModel" TEXT;
ALTER TABLE "MarketingEventFeedback" ADD COLUMN IF NOT EXISTS "aiTextHash" TEXT;
ALTER TABLE "MarketingEventFeedback" ADD COLUMN IF NOT EXISTS "aiAnalyzedAt" TIMESTAMP(3);

-- 3. Structured stock / impact distribution + cached weighted score snapshot.
ALTER TABLE "MarketingPostEventReport" ADD COLUMN IF NOT EXISTS "impactDistribution" TEXT DEFAULT '[]';
ALTER TABLE "MarketingPostEventReport" ALTER COLUMN "eventSuccessRate" TYPE DOUBLE PRECISION
  USING "eventSuccessRate"::double precision;
ALTER TABLE "MarketingPostEventReport" ALTER COLUMN "eventSuccessRate" SET DEFAULT 0;
ALTER TABLE "MarketingPostEventReport" ADD COLUMN IF NOT EXISTS "scoreBreakdown" TEXT DEFAULT '{}';
ALTER TABLE "MarketingPostEventReport" ADD COLUMN IF NOT EXISTS "scoreComputedAt" TIMESTAMP(3);
ALTER TABLE "MarketingPostEventReport" ADD COLUMN IF NOT EXISTS "scoreFlags" TEXT DEFAULT '[]';
