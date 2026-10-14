-- Add readAt column if it does not already exist
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);

-- Add composite index for tenant, user and read status
CREATE INDEX IF NOT EXISTS "Notification_collegeId_userId_readAt_idx" ON "Notification"("collegeId", "userId", "readAt");
