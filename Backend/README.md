# Zuna ERP Backend Architecture

This is the production-ready Node.js + Express backend designed for the Zuna College ERP.

## Multi-Tenancy Guarantee
This backend uses **Row-Level Tenant Isolation** via a shared database:
- **`resolveTenant` Middleware:** Every protected route is intercepted by the `resolveTenant` middleware. This extracts the `collegeId` securely from the signed JWT payload.
- **Tenant Scope:** Client-supplied IDs in request bodies or query parameters are ignored. All database queries natively inject `req.tenant.collegeId` ensuring cross-tenant data leaks are structurally impossible.
- **Superadmin:** The `superadmin` role bypasses the `resolveTenant` block, allowing platform-wide queries (like total subscriptions, billing, etc.).

## Redis Caching Strategy
We employ a **Fail-Open Cache-Aside pattern** (`lib/cache.js`) using `ioredis`. 
- **Eligible for Cache:** Aggregate stats (dashboard cards), Timetable grids, and Notice boards (invalidated on publish).
- **Never Cached:** Financial records (Fee payments), Marks, and Admissions statuses. Stale reads on these are strictly prohibited.
- **Fail-Open:** If the Redis instance fails, the backend gracefully falls back to direct PostgreSQL queries instead of crashing the app.

## Deployment on Railway
This app is designed for Railway's ecosystem:
1. Attach a **PostgreSQL** plugin.
2. Attach a **Redis** plugin.
3. Deploy this repo as a standard web service. Railway auto-injects `DATABASE_URL` and `REDIS_URL`.
4. `railway.json` dictates the Nixpacks build strategy.
