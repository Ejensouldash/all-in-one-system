CREATE TABLE IF NOT EXISTS "CreditCheckCase" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "poFileName" TEXT NOT NULL,
  "poR2ObjectKey" TEXT NOT NULL,
  "soaFileName" TEXT NOT NULL,
  "soaR2ObjectKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'UPLOADED',
  "recommendation" TEXT,
  "poData" JSONB,
  "soaData" JSONB,
  "result" JSONB,
  "justification" TEXT,
  "finalDecision" TEXT,
  "decidedById" TEXT,
  "decidedAt" TIMESTAMP(3),
  "uploadedById" TEXT NOT NULL,
  "aiModel" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CreditCheckCase_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CreditCheckCase_poR2ObjectKey_key" ON "CreditCheckCase"("poR2ObjectKey");
CREATE UNIQUE INDEX IF NOT EXISTS "CreditCheckCase_soaR2ObjectKey_key" ON "CreditCheckCase"("soaR2ObjectKey");
CREATE INDEX IF NOT EXISTS "CreditCheckCase_status_createdAt_idx" ON "CreditCheckCase"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "CreditCheckCase_recommendation_createdAt_idx" ON "CreditCheckCase"("recommendation", "createdAt");
