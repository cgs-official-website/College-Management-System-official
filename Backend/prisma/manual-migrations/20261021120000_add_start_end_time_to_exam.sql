-- Purpose: Exam hall conflict validation (BUG-EXAM-005)
-- Safe to run multiple times (idempotent)

BEGIN;

ALTER TABLE "Exam"
  ADD COLUMN IF NOT EXISTS "startTime" VARCHAR(10),
  ADD COLUMN IF NOT EXISTS "endTime" VARCHAR(10);

COMMIT;
