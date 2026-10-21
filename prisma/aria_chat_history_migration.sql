-- Additive Aria chatbot history migration.
-- Scope: AriaChatSession / AriaChatMessage only. Unrelated tables remain untouched.

CREATE TABLE IF NOT EXISTS "AriaChatSession" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AriaChatSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AriaChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AriaChatSession_userId_updatedAt_idx" ON "AriaChatSession"("userId", "updatedAt");

CREATE TABLE IF NOT EXISTS "AriaChatMessage" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "sessionId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AriaChatMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AriaChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AriaChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AriaChatMessage_sessionId_createdAt_idx" ON "AriaChatMessage"("sessionId", "createdAt");
