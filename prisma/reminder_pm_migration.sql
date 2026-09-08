-- Additive Preventive Maintenance (SGMP-03) migration for Reminders module.
-- Scope: Reminders PM tables only. Unrelated tables remain untouched.

CREATE TABLE IF NOT EXISTS "ReminderPMImport" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "fileHash" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "rows" JSONB NOT NULL,
  "review" JSONB,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" TIMESTAMP(3),
  CONSTRAINT "ReminderPMImport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReminderPMImport_fileHash_key" ON "ReminderPMImport"("fileHash");

CREATE TABLE IF NOT EXISTS "ReminderPMSchedule" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "sourceKey" TEXT,
  "importId" TEXT,
  "sourceRows" JSONB,
  "equipment" TEXT NOT NULL,
  "srs" TEXT,
  "checklist" TEXT[] NOT NULL,
  "startDate" TEXT NOT NULL,
  "intervalUnit" TEXT NOT NULL,
  "intervalCount" INTEGER NOT NULL,
  "activationDate" TEXT NOT NULL,
  "generationFrom" TEXT NOT NULL,
  "picIds" TEXT[] NOT NULL,
  "createdById" TEXT NOT NULL,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReminderPMSchedule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReminderPMSchedule_sourceKey_key" ON "ReminderPMSchedule"("sourceKey");
CREATE INDEX IF NOT EXISTS "ReminderPMSchedule_archivedAt_idx" ON "ReminderPMSchedule"("archivedAt");

CREATE TABLE IF NOT EXISTS "ReminderPMOccurrence" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "scheduleId" TEXT NOT NULL,
  "dueDate" TEXT NOT NULL,
  "equipment" TEXT NOT NULL,
  "srs" TEXT,
  "checklist" TEXT[] NOT NULL,
  "picIds" TEXT[] NOT NULL,
  "result" TEXT,
  "notes" TEXT,
  "inspectedDate" TEXT,
  "completedById" TEXT,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "ReminderPMOccurrence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReminderPMOccurrence_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "ReminderPMSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReminderPMOccurrence_scheduleId_dueDate_key" ON "ReminderPMOccurrence"("scheduleId", "dueDate");
CREATE INDEX IF NOT EXISTS "ReminderPMOccurrence_dueDate_completedAt_idx" ON "ReminderPMOccurrence"("dueDate", "completedAt");

CREATE TABLE IF NOT EXISTS "ReminderPMDelivery" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "digestDate" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SENDING',
  "attempts" INTEGER NOT NULL DEFAULT 1,
  "detail" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReminderPMDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReminderPMDelivery_userId_digestDate_key" ON "ReminderPMDelivery"("userId", "digestDate");
