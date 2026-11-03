-- Create MarketingEventFeedback table and add galleryAttachments column to MarketingEventRequisition
ALTER TABLE "MarketingEventRequisition" 
ADD COLUMN IF NOT EXISTS "galleryAttachments" TEXT DEFAULT '[]';

CREATE TABLE IF NOT EXISTS "MarketingEventFeedback" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "requisitionId" TEXT NOT NULL,
  "respondentName" TEXT NOT NULL,
  "likedMost" TEXT NOT NULL,
  "likedLeast" TEXT NOT NULL,
  "satisfaction" TEXT NOT NULL,
  "wellOrganized" BOOLEAN NOT NULL DEFAULT true,
  "comments" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketingEventFeedback_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MarketingEventFeedback_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "MarketingEventRequisition"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MarketingEventFeedback_requisitionId_idx" ON "MarketingEventFeedback"("requisitionId");
CREATE INDEX IF NOT EXISTS "MarketingEventFeedback_createdAt_idx" ON "MarketingEventFeedback"("createdAt");
