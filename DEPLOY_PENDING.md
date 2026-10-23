# Railway Deployment Pending Checklist

This document details all deployment-blocking and environment-specific tasks that must be executed when promoting the `feature/college-domain-enforcement` branch to Railway and production.

---

## 1. Apply Database Migration (`prisma/college-domain.sql`)
- [ ] Connect to the target PostgreSQL database (e.g. using `psql`, pgAdmin, or Railway Query CLI).
- [ ] Execute `Backend/prisma/college-domain.sql` directly:
  ```bash
  psql "$DATABASE_URL" -f Backend/prisma/college-domain.sql
  ```
  > **Note**: This creates:
  > - Enum `CollegeDomainStatus` (`PENDING`, `VERIFIED`).
  > - Table `CollegeDomain` (`id`, `collegeId`, `domain`, `verificationToken`, `status`, `verifiedAt`, timestamps).
  > - Unique compound constraint on `(collegeId, domain)`.
  > - Partial unique index `college_domains_verified_unique` on `(domain)` where `status = 'VERIFIED'`.
  > - Foreign key constraint referencing `colleges(id)` with `ON DELETE CASCADE`.

---

## 2. Environment Variables Configuration
Set the following secrets in Railway dashboard / environment settings before redeployment:
- [ ] **`JWT_SECRET`**: Generate and set a new, cryptographically secure random string (minimum 64+ characters):
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
- [ ] **`JWT_REFRESH_SECRET`**: Generate and set a new distinct secure random string (minimum 64+ characters):
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```
- [ ] **`REDIS_URL`**: Ensure the Redis connection URL (e.g. `redis://default:<password>@<host>:<port>`) is configured. The application runs fail-open when Redis is unreachable, but active Redis is required for low-latency domain verification checks and session caching.

---

## 3. Rotate Credentials
- [ ] **Priya's Admin Password**: Rotate password for Priya's administrative account (`priya@zuna.edu` / corresponding admin credential) immediately in production, as default fixtures and development passwords were used during test suites.

---

## 4. Confirm Database Target & Environment Safety
- [ ] Verify whether `DATABASE_URL` (`monorail.proxy.rlwy.net:41162/railway`) represents the development/staging database or production:
  - If staging/dev, confirm readiness for promoting to production instance.
  - If production, ensure backups or point-in-time recovery (PITR) snapshots are taken prior to schema execution.

---

## 5. Pre-Deployment Integration Validation
- [ ] Once Redis is provisioned and `REDIS_URL` is set, execute Test (j) against real Redis:
  ```bash
  node Backend/scripts/test-domain-enforcement.mjs
  ```
  - Verify that Test (j) transitions from `SKIPPED` to `PASS`:
    - `✅ Test (j) [PASS]: Cache invalidation functions accurately on domain verify and delete`

---

## 6. Railway Deployment & Verification
- [ ] Merge `feature/college-domain-enforcement` into `main` (or trigger Railway deployment from branch).
- [ ] Verify health check at `GET /api/v1/health`.
- [ ] Log in as Admin to verify Domain Management UI under `/admin/domains` and College Settings.
- [ ] Verify non-compliant user banner and audit listing under `/admin/non-compliant-users`.
