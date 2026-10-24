# Railway Deployment Pending Checklist

This document details all deployment-blocking and environment-specific tasks that must be executed when promoting the `feature/college-domain-enforcement` branch to Railway and production.

---

## 1. Apply Database Migration (`prisma/college-domain.sql`)
- [ ] Connect to the target PostgreSQL database (e.g. using `psql`, pgAdmin, or Railway Query CLI).
- [ ] Execute `Backend/prisma/college-domain.sql` directly:
  ```bash
  psql "$DATABASE_URL" -f Backend/prisma/college-domain.sql
  ```
  > **Note**: This creates/updates:
  > - Enum `CollegeDomainStatus` (`PENDING`, `VERIFIED`).
  > - Table `CollegeDomain` (`id`, `collegeId`, `domain`, `verificationToken`, `status`, `verifiedAt`, timestamps).
  > - Column `"College"."allowPersonalEmail"` (`BOOLEAN NOT NULL DEFAULT false`) via idempotent `ADD COLUMN IF NOT EXISTS`.
  > - Unique compound constraint on `(collegeId, domain)`.
  > - Partial unique index `college_domains_verified_unique` on `(domain)` where `status = 'VERIFIED'`.
  > - Foreign key constraint referencing `colleges(id)` with `ON DELETE CASCADE`.

---

## 2. Login Behavior & Grandfathering Advisory
- [ ] **Grandfathering for Existing Accounts**:
  - **Existing gmail students lock aaga maattaanga. Toggle pudhu creation-ku mattum.**
  - Pre-existing accounts (student, teacher, staff, admin) whose emails do not match college verified domains are **never blocked at login** (they receive 200 OK + `EMAIL_DOMAIN_MISMATCH` soft warning banner).
  - Students created with `@gmail.com` when the toggle was ON can set their password and log in at any time, even after the toggle is switched OFF.
- [ ] **Creation-Side Enforcement (Toggle Control)**:
  - The "Allow Gmail addresses" toggle (`allowPersonalEmail`) strictly controls **new account creation and profile updates**:
    - Toggle ON: `@gmail.com` exact match permitted for new account creation.
    - Toggle OFF: `@gmail.com` blocked (403 `EMAIL_DOMAIN_NOT_ALLOWED`) on student/staff creation, admin email edit, bulk import, and self-registration.
    - Non-compliant users audit page flags `@gmail.com` users when toggle is OFF, and unflags them when toggle is ON.
- [ ] **Admin Lockout Protection**:
  - `admin`, `superadmin`, and `parent` roles are **always permitted to log in** and are exempt from creation domain checks.

---

## 3. Environment Variables Configuration
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

## 4. Rotate Credentials
- [ ] **Priya's Admin Password**: Rotate password for Priya's administrative account (`priya@zuna.edu` / corresponding admin credential) immediately in production, as default fixtures and development passwords were used during test suites.

---

## 5. Confirm Database Target & Environment Safety
- [ ] Verify whether `DATABASE_URL` (`monorail.proxy.rlwy.net:41162/railway`) represents the development/staging database or production:
  - If staging/dev, confirm readiness for promoting to production instance.
  - If production, ensure backups or point-in-time recovery (PITR) snapshots are taken prior to schema execution.

---

## 6. Pre-Deployment Integration Validation
- [ ] Once Redis is provisioned and `REDIS_URL` is set, execute Test (j) against real Redis:
  ```bash
  node Backend/scripts/test-domain-enforcement.mjs
  node Backend/scripts/test-domain-step3c.mjs
  ```
  - Verify that all test suites PASS cleanly.

---

## 7. Railway Deployment & Verification
- [ ] Merge `feature/college-domain-enforcement` into `main` (or trigger Railway deployment from branch).
- [ ] Verify health check at `GET /api/v1/health`.
- [ ] Log in as Admin to verify Domain Management UI under `/admin/domains` and "Allow Gmail addresses" toggle switch.
- [ ] Verify non-compliant user banner and audit listing under `/admin/non-compliant-users`.

