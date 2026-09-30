BEGIN;

ALTER TABLE "Teacher"
ADD COLUMN IF NOT EXISTS "teacherId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Teacher_collegeId_teacherId_key"
ON "Teacher"("collegeId", "teacherId");

COMMIT;