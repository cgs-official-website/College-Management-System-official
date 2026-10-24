-- College Domain verification and restriction module table
CREATE TABLE IF NOT EXISTS "CollegeDomain" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "collegeId" UUID NOT NULL,
  "domain" VARCHAR(255) NOT NULL,
  "verificationToken" VARCHAR(255) NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  "verifiedAt" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollegeDomain_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Unique domain per college
CREATE UNIQUE INDEX IF NOT EXISTS "CollegeDomain_collegeId_domain_key" ON "CollegeDomain"("collegeId", "domain");

-- Fast domain lookup index
CREATE INDEX IF NOT EXISTS "CollegeDomain_domain_idx" ON "CollegeDomain"("domain");

-- Tenant index
CREATE INDEX IF NOT EXISTS "CollegeDomain_collegeId_idx" ON "CollegeDomain"("collegeId");

-- Global uniqueness for VERIFIED domains (verified domain cannot be verified by another college)
CREATE UNIQUE INDEX IF NOT EXISTS "CollegeDomain_verified_domain_key" ON "CollegeDomain"("domain") WHERE "status" = 'VERIFIED';

-- College personal email (e.g. gmail.com) toggle
ALTER TABLE "College" ADD COLUMN IF NOT EXISTS "allowPersonalEmail" BOOLEAN NOT NULL DEFAULT false;
