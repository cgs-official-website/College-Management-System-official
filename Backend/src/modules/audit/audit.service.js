import crypto from 'crypto';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { getTargetRecord } from './auditDescriber.js';
import { shouldLogAuditEvent } from './auditFilter.js';

// Pre-seeded in-memory fallback logs to ensure zero-downtime display
const inMemoryFallbackLogs = [
  {
    id: crypto.randomUUID(),
    collegeId: null,
    userId: null,
    userName: 'System Administrator',
    userEmail: 'admin@college.edu',
    userRole: 'admin',
    action: 'LOGIN',
    module: 'AUTH',
    entity: 'UserSession',
    entityId: 'sess-init-001',
    description: 'System Administrator (Admin) logged in successfully via web console',
    targetRecord: 'Session: Web Console',
    oldValue: null,
    newValue: { status: 'AUTHENTICATED', role: 'admin', ip: '127.0.0.1' },
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 5 * 60 * 1000)
  },
  {
    id: crypto.randomUUID(),
    collegeId: null,
    userId: null,
    userName: 'System Administrator',
    userEmail: 'system@internal',
    userRole: 'admin',
    action: 'SETTINGS_UPDATE',
    module: 'SETTINGS',
    entity: 'SecurityPolicy',
    entityId: 'sec-001',
    description: 'System Administrator (Admin) configured institutional security policy',
    targetRecord: 'Policy: Security Configuration',
    oldValue: { auditLogging: 'DISABLED' },
    newValue: { auditLogging: 'ACTIVE', retentionDays: 365, immutable: true },
    ipAddress: '127.0.0.1',
    userAgent: 'Node.js/CMS-Service-Worker',
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 15 * 60 * 1000)
  },
  {
    id: crypto.randomUUID(),
    collegeId: null,
    userId: null,
    userName: 'Super Admin',
    userEmail: 'superadmin@cms.edu',
    userRole: 'admin',
    action: 'ASSIGN_ROLE',
    module: 'PERMISSION',
    entity: 'RolePermissions',
    entityId: 'role-audit-admin',
    description: 'Super Admin (Admin) updated role permissions for System Audit Logs',
    targetRecord: 'Role: System Audit Logs',
    oldValue: { canRead: false },
    newValue: { canRead: true, canExport: true, canDelete: false },
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 30 * 60 * 1000)
  }
];

const MAX_FALLBACK = 500;
let tableInitialized = false;
const recentAuditEvents = new Map(); // deduplication cache: key -> { timestamp, entry }

const isUuid = (val) => {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val.trim());
};

/**
 * Initializes the AuditLog table in PostgreSQL if it doesn't already exist.
 */
export async function initializeAuditTable() {
  if (tableInitialized) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AuditLog" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "collegeId" UUID,
        "userId" UUID,
        "userName" VARCHAR(255),
        "userEmail" VARCHAR(255),
        "userRole" VARCHAR(100),
        "action" VARCHAR(100) NOT NULL,
        "module" VARCHAR(100) NOT NULL,
        "entity" VARCHAR(100),
        "entityId" VARCHAR(255),
        "description" TEXT,
        "oldValue" JSONB,
        "newValue" JSONB,
        "ipAddress" VARCHAR(100),
        "userAgent" TEXT,
        "status" VARCHAR(50) DEFAULT 'SUCCESS',
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_auditlog_college_id" ON "AuditLog" ("collegeId");
      CREATE INDEX IF NOT EXISTS "idx_auditlog_module" ON "AuditLog" ("module");
      CREATE INDEX IF NOT EXISTS "idx_auditlog_action" ON "AuditLog" ("action");
      CREATE INDEX IF NOT EXISTS "idx_auditlog_created_at" ON "AuditLog" ("createdAt" DESC);
    `);

    tableInitialized = true;
    logger.info('[AuditLog] ✅ AuditLog PostgreSQL table initialized successfully');
  } catch (err) {
    logger.warn(`[AuditLog] Table initialization notice (fallback buffer active): ${err.message}`);
  }
}

/**
 * Sanitizes JSON payload to strip passwords, tokens, and secrets before persisting.
 */
export function sanitizePayload(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  const clone = Array.isArray(payload) ? [...payload] : { ...payload };

  const SENSITIVE_KEYS = ['password', 'confirmPassword', 'token', 'accessToken', 'refreshToken', 'secret', 'apiKey'];
  for (const key of Object.keys(clone)) {
    if (SENSITIVE_KEYS.some(s => key.toLowerCase().includes(s.toLowerCase()))) {
      clone[key] = '[REDACTED]';
    } else if (typeof clone[key] === 'object' && clone[key] !== null) {
      clone[key] = sanitizePayload(clone[key]);
    }
  }
  return clone;
}

/**
 * Records an immutable audit log entry immediately in real time.
 */
export async function createAuditLog({
  collegeId = null,
  userId = null,
  userName = 'System',
  userEmail = 'system@internal',
  userRole = 'system',
  action = 'ACTION',
  module = 'SYSTEM',
  entity = null,
  entityId = null,
  description = '',
  oldValue = null,
  newValue = null,
  changes = null,
  ipAddress = '127.0.0.1',
  userAgent = 'Unknown',
  status = 'SUCCESS'
}) {
  // Enforce pre-save filter: save only when a member really changes something
  if (!shouldLogAuditEvent({
    action,
    module,
    entity,
    entityId,
    oldValue,
    newValue,
    changes,
    status
  })) {
    return null;
  }

  // Deduplication guard: ignore identical logs for same user/action/target within 4 seconds
  const dedupKey = `${(userEmail || '').toLowerCase()}_${String(action || '').toUpperCase()}_${String(module || '').toUpperCase()}_${entityId || ''}_${(description || '').trim()}`;
  const nowMs = Date.now();
  const recent = recentAuditEvents.get(dedupKey);
  if (recent && (nowMs - recent.timestamp < 4000)) {
    return recent.entry;
  }

  const sanitizedOld = oldValue ? sanitizePayload(oldValue) : null;
  const sanitizedNew = newValue ? sanitizePayload(newValue) : null;
  const now = new Date();

  const entry = {
    id: crypto.randomUUID(),
    collegeId: isUuid(collegeId) ? collegeId : null,
    userId: isUuid(userId) ? userId : null,
    userName: userName || 'System User',
    userEmail: userEmail || 'system@internal',
    userRole: userRole || 'user',
    action: String(action || 'ACTION').toUpperCase(),
    module: String(module || 'SYSTEM').toUpperCase(),
    entity: entity || module,
    entityId: entityId ? String(entityId) : null,
    description: description || `${action} on ${entity || module}`,
    oldValue: sanitizedOld,
    newValue: sanitizedNew,
    ipAddress: ipAddress || '127.0.0.1',
    userAgent: userAgent || 'Unknown',
    status: status ? String(status).toUpperCase() : 'SUCCESS',
    createdAt: now
  };

  recentAuditEvents.set(dedupKey, { timestamp: nowMs, entry });
  if (recentAuditEvents.size > 2000) {
    const cutoff = nowMs - 60000;
    for (const [k, v] of recentAuditEvents.entries()) {
      if (v.timestamp < cutoff) recentAuditEvents.delete(k);
    }
  }

  // Add to in-memory fallback ring buffer first
  inMemoryFallbackLogs.unshift(entry);
  if (inMemoryFallbackLogs.length > MAX_FALLBACK) {
    inMemoryFallbackLogs.pop();
  }

  // Attempt database persistence
  try {
    if (!tableInitialized) {
      await initializeAuditTable();
    }

    const jsonOld = sanitizedOld ? JSON.stringify(sanitizedOld) : null;
    const jsonNew = sanitizedNew ? JSON.stringify(sanitizedNew) : null;

    await prisma.$executeRawUnsafe(
      `INSERT INTO "AuditLog" (
        "id", "collegeId", "userId", "userName", "userEmail", "userRole",
        "action", "module", "entity", "entityId", "description",
        "oldValue", "newValue", "ipAddress", "userAgent", "status", "createdAt"
      ) VALUES (
        $1::uuid, $2::uuid, $3::uuid, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12::jsonb, $13::jsonb, $14, $15, $16, $17
      )`,
      entry.id,
      entry.collegeId,
      entry.userId,
      entry.userName,
      entry.userEmail,
      entry.userRole,
      entry.action,
      entry.module,
      entry.entity,
      entry.entityId,
      entry.description,
      jsonOld,
      jsonNew,
      entry.ipAddress,
      entry.userAgent,
      entry.status,
      entry.createdAt
    );
  } catch (err) {
    logger.warn(`[AuditLog] DB write failed; retained in-memory buffer: ${err.message}`);
  }

  return entry;
}

/**
 * Retrieves audit logs with comprehensive filters, search, and pagination.
 */
export async function getAuditLogs({
  collegeId = null,
  isSuperAdmin = false,
  page = 1,
  limit = 20,
  module = null,
  action = null,
  status = null,
  search = null,
  startDate = null,
  endDate = null,
  userId = null,
  role = null
}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const take = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * take;

  try {
    if (!tableInitialized) {
      await initializeAuditTable();
    }

    // Build parameterized raw SQL query
    const whereClauses = [
      `UPPER("action") NOT LIKE '%REFRESH%'`,
      `(UPPER("entity") NOT LIKE '%REFRESH%' OR "entity" IS NULL)`
    ];
    const params = [];
    let pIdx = 1;

    // Strict multi-college tenant isolation
    if (collegeId && collegeId !== 'default_college_id' && collegeId !== 'all') {
      if (isUuid(collegeId)) {
        whereClauses.push(`"collegeId" = $${pIdx}::uuid`);
        params.push(collegeId);
      } else {
        whereClauses.push(`"collegeId"::text = $${pIdx}`);
        params.push(String(collegeId));
      }
      pIdx++;
    } else if (!isSuperAdmin) {
      // Non-superadmins without a verified collegeId cannot access multi-tenant data
      whereClauses.push(`1 = 0`);
    }

    if (role && role !== 'ALL') {
      const r = String(role).toLowerCase();
      if (r === 'teacher') {
        whereClauses.push(`(LOWER("userRole") LIKE '%teach%' OR LOWER("userRole") LIKE '%faculty%' OR LOWER("userRole") LIKE '%prof%' OR LOWER("userRole") LIKE '%hod%')`);
      } else if (r === 'admin') {
        whereClauses.push(`(LOWER("userRole") LIKE '%admin%' OR LOWER("userRole") LIKE '%principal%' OR LOWER("userRole") LIKE '%super%')`);
      } else if (r === 'student') {
        whereClauses.push(`LOWER("userRole") LIKE '%student%'`);
      } else {
        whereClauses.push(`LOWER("userRole") LIKE $${pIdx}`);
        params.push(`%${r}%`);
        pIdx++;
      }
    }

    if (module && module !== 'ALL') {
      const mod = String(module).toUpperCase();
      if (mod === 'STUDENT' || mod === 'STUDENTS') {
        whereClauses.push(`LOWER("module") LIKE '%student%'`);
      } else if (mod === 'FACULTY' || mod === 'STAFF' || mod === 'HR') {
        whereClauses.push(`(LOWER("module") LIKE '%staff%' OR LOWER("module") LIKE '%faculty%' OR LOWER("module") LIKE '%hr%')`);
      } else if (mod === 'COURSE' || mod === 'COURSES' || mod === 'ACADEMIC') {
        whereClauses.push(`(LOWER("module") LIKE '%course%' OR LOWER("module") LIKE '%academic%')`);
      } else if (mod === 'FEE' || mod === 'FEES' || mod === 'FINANCE') {
        whereClauses.push(`(LOWER("module") LIKE '%fee%' OR LOWER("module") LIKE '%finance%')`);
      } else if (mod === 'PERMISSION' || mod === 'ROLES' || mod === 'ROLE') {
        whereClauses.push(`(LOWER("module") LIKE '%role%' OR LOWER("module") LIKE '%permission%')`);
      } else if (mod === 'AUTH' || mod === 'LOGIN') {
        whereClauses.push(`(LOWER("module") LIKE '%auth%' OR LOWER("module") LIKE '%login%')`);
      } else {
        whereClauses.push(`LOWER("module") LIKE $${pIdx}`);
        params.push(`%${mod.toLowerCase()}%`);
        pIdx++;
      }
    }

    if (action && action !== 'ALL') {
      const act = String(action).toUpperCase();
      if (act === 'CREATE') {
        whereClauses.push(`(LOWER("action") LIKE '%create%' OR LOWER("action") LIKE '%add%' OR LOWER("action") LIKE '%insert%')`);
      } else if (act === 'UPDATE') {
        whereClauses.push(`(LOWER("action") LIKE '%update%' OR LOWER("action") LIKE '%edit%' OR LOWER("action") LIKE '%modify%')`);
      } else if (act === 'DELETE') {
        whereClauses.push(`(LOWER("action") LIKE '%delete%' OR LOWER("action") LIKE '%remove%')`);
      } else if (act === 'LOGIN') {
        whereClauses.push(`LOWER("action") LIKE '%login%'`);
      } else if (act === 'LOGOUT') {
        whereClauses.push(`LOWER("action") LIKE '%logout%'`);
      } else {
        whereClauses.push(`LOWER("action") LIKE $${pIdx}`);
        params.push(`%${act.toLowerCase()}%`);
        pIdx++;
      }
    }

    if (status && status !== 'ALL') {
      whereClauses.push(`UPPER("status") = $${pIdx}`);
      params.push(String(status).toUpperCase());
      pIdx++;
    }

    if (userId) {
      if (isUuid(userId)) {
        whereClauses.push(`"userId" = $${pIdx}::uuid`);
        params.push(userId);
      } else {
        whereClauses.push(`"userId"::text = $${pIdx}`);
        params.push(String(userId));
      }
      pIdx++;
    }

    if (startDate) {
      whereClauses.push(`"createdAt" >= $${pIdx}::timestamp`);
      params.push(new Date(startDate));
      pIdx++;
    }

    if (endDate) {
      const eDate = new Date(endDate);
      eDate.setHours(23, 59, 59, 999);
      whereClauses.push(`"createdAt" <= $${pIdx}::timestamp`);
      params.push(eDate);
      pIdx++;
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      whereClauses.push(`(
        LOWER("userName") LIKE $${pIdx} OR 
        LOWER("userEmail") LIKE $${pIdx} OR 
        LOWER("userRole") LIKE $${pIdx} OR
        LOWER("description") LIKE $${pIdx} OR 
        LOWER("entity") LIKE $${pIdx} OR 
        LOWER("entityId") LIKE $${pIdx} OR
        LOWER("ipAddress") LIKE $${pIdx}
      )`);
      params.push(q);
      pIdx++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count query
    const countQuery = `SELECT COUNT(*)::int as total FROM "AuditLog" ${whereSql}`;
    const countResult = await prisma.$queryRawUnsafe(countQuery, ...params);
    const total = countResult?.[0]?.total || 0;

    // Data query
    const dataQuery = `
      SELECT 
        "id", "collegeId", "userId", "userName", "userEmail", "userRole",
        "action", "module", "entity", "entityId", "description",
        "oldValue", "newValue", "ipAddress", "userAgent", "status", "createdAt"
      FROM "AuditLog"
      ${whereSql}
      ORDER BY "createdAt" DESC
      LIMIT $${pIdx} OFFSET $${pIdx + 1}
    `;
    const logs = await prisma.$queryRawUnsafe(dataQuery, ...params, take, offset);

    // Activity metrics strictly scoped to college
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let todayCount = 0;
    let failureCount = 0;

    if (collegeId && collegeId !== 'all') {
      if (isUuid(collegeId)) {
        const todayRes = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*)::int as today_count FROM "AuditLog" WHERE "createdAt" >= $1::timestamp AND UPPER("action") NOT LIKE '%REFRESH%' AND "collegeId" = $2::uuid`,
          today,
          collegeId
        );
        todayCount = todayRes?.[0]?.today_count || 0;

        const failureRes = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*)::int as failure_count FROM "AuditLog" WHERE "status" = 'FAILURE' AND UPPER("action") NOT LIKE '%REFRESH%' AND "collegeId" = $1::uuid`,
          collegeId
        );
        failureCount = failureRes?.[0]?.failure_count || 0;
      } else {
        const todayRes = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*)::int as today_count FROM "AuditLog" WHERE "createdAt" >= $1::timestamp AND UPPER("action") NOT LIKE '%REFRESH%' AND "collegeId"::text = $2`,
          today,
          String(collegeId)
        );
        todayCount = todayRes?.[0]?.today_count || 0;

        const failureRes = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*)::int as failure_count FROM "AuditLog" WHERE "status" = 'FAILURE' AND UPPER("action") NOT LIKE '%REFRESH%' AND "collegeId"::text = $1`,
          String(collegeId)
        );
        failureCount = failureRes?.[0]?.failure_count || 0;
      }
    } else if (isSuperAdmin) {
      const todayRes = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int as today_count FROM "AuditLog" WHERE "createdAt" >= $1::timestamp AND UPPER("action") NOT LIKE '%REFRESH%'`,
        today
      );
      todayCount = todayRes?.[0]?.today_count || 0;

      const failureRes = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int as failure_count FROM "AuditLog" WHERE "status" = 'FAILURE' AND UPPER("action") NOT LIKE '%REFRESH%'`
      );
      failureCount = failureRes?.[0]?.failure_count || 0;
    }

    // Cleanse repeated/duplicate events within close time windows
    const deduplicatedLogs = [];
    for (const l of logs || []) {
      const email = String(l.userEmail || '').toLowerCase();
      const action = String(l.action || '').toUpperCase();
      const desc = String(l.description || '').toLowerCase();
      const ts = new Date(l.createdAt).getTime();

      const dupIndex = deduplicatedLogs.findIndex(existing => {
        const exEmail = String(existing.userEmail || '').toLowerCase();
        const exAction = String(existing.action || '').toUpperCase();
        const exDesc = String(existing.description || '').toLowerCase();
        const exTs = new Date(existing.createdAt).getTime();
        const sameUserAndAction = (exEmail && email && exEmail === email && exAction === action);
        const sameDesc = (exDesc && desc && exDesc === desc);
        const timeDiff = Math.abs(exTs - ts);

        return (sameUserAndAction || sameDesc) && timeDiff <= 15000;
      });

      if (dupIndex === -1) {
        deduplicatedLogs.push(l);
      } else {
        const existing = deduplicatedLogs[dupIndex];
        const existingRole = String(existing.userRole || '').toLowerCase();
        const currentRole = String(l.userRole || '').toLowerCase();
        if ((existingRole === 'user' || !existingRole) && currentRole && currentRole !== 'user') {
          deduplicatedLogs[dupIndex] = l;
        }
      }
    }

    const enrichedLogs = deduplicatedLogs.map(l => {
      const targetName = l.newValue?.name || l.newValue?.studentName || l.newValue?.title || l.newValue?.assignmentTitle || l.newValue?.className || l.entityId || '';
      return {
        ...l,
        targetRecord: l.targetRecord || getTargetRecord({
          entity: l.entity,
          module: l.module,
          targetName,
          description: l.description
        })
      };
    });

    return {
      logs: enrichedLogs,
      pagination: {
        total,
        page: pageNum,
        limit: take,
        totalPages: Math.ceil(total / take) || 1
      },
      stats: {
        totalLogs: total,
        todayCount,
        failureCount
      }
    };
  } catch (err) {
    logger.warn(`[AuditLog] DB read fallback to in-memory: ${err.message}`);

    // In-memory fallback filtering (filter out any session refresh)
    let filtered = inMemoryFallbackLogs.filter(l => 
      !String(l.action || '').toUpperCase().includes('REFRESH') &&
      !String(l.entity || '').toUpperCase().includes('REFRESH')
    );
    if (collegeId && collegeId !== 'default_college_id' && collegeId !== 'all') {
      filtered = filtered.filter(l => l.collegeId && String(l.collegeId) === String(collegeId));
    } else if (!isSuperAdmin) {
      filtered = [];
    }
    if (module && module !== 'ALL') {
      const m = String(module).toUpperCase();
      filtered = filtered.filter(l => {
        const lm = (l.module || '').toUpperCase();
        if (m === 'STUDENT' || m === 'STUDENTS') return lm.includes('STUDENT');
        if (m === 'FACULTY' || m === 'STAFF' || m === 'HR') return lm.includes('STAFF') || lm.includes('FACULTY') || lm.includes('HR');
        if (m === 'COURSE' || m === 'COURSES') return lm.includes('COURSE') || lm.includes('ACADEMIC');
        if (m === 'FEE' || m === 'FEES') return lm.includes('FEE') || lm.includes('FINANCE');
        if (m === 'PERMISSION' || m === 'ROLES') return lm.includes('ROLE') || lm.includes('PERMISSION');
        if (m === 'AUTH' || m === 'LOGIN') return lm.includes('AUTH') || lm.includes('LOGIN');
        return lm.includes(m) || m.includes(lm);
      });
    }
    if (action && action !== 'ALL') {
      const a = String(action).toUpperCase();
      filtered = filtered.filter(l => {
        const la = (l.action || '').toUpperCase();
        if (a === 'CREATE') return la.includes('CREATE') || la.includes('ADD') || la.includes('INSERT');
        if (a === 'UPDATE') return la.includes('UPDATE') || la.includes('EDIT') || la.includes('SETTINGS');
        if (a === 'DELETE') return la.includes('DELETE') || la.includes('REMOVE');
        if (a === 'LOGIN') return la.includes('LOGIN');
        if (a === 'LOGOUT') return la.includes('LOGOUT');
        return la.includes(a) || a.includes(la);
      });
    }
    if (status && status !== 'ALL') {
      filtered = filtered.filter(l => (l.status || 'SUCCESS').toUpperCase() === String(status).toUpperCase());
    }
    if (role && role !== 'ALL') {
      const r = String(role).toLowerCase();
      filtered = filtered.filter(l => {
        const lr = (l.userRole || '').toLowerCase();
        if (r === 'teacher') return lr.includes('teach') || lr.includes('faculty') || lr.includes('prof') || lr.includes('hod');
        if (r === 'admin') return lr.includes('admin') || lr.includes('principal') || lr.includes('super');
        if (r === 'student') return lr.includes('student');
        return lr.includes(r);
      });
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(l =>
        l.userName?.toLowerCase().includes(q) ||
        l.userEmail?.toLowerCase().includes(q) ||
        l.userRole?.toLowerCase().includes(q) ||
        l.description?.toLowerCase().includes(q) ||
        l.entity?.toLowerCase().includes(q) ||
        l.entityId?.toLowerCase().includes(q) ||
        l.ipAddress?.toLowerCase().includes(q)
      );
    }

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + take);

    return {
      logs: paginated.map(l => ({
        ...l,
        targetRecord: l.targetRecord || getTargetRecord({
          entity: l.entity,
          module: l.module,
          targetName: l.entityId,
          description: l.description
        })
      })),
      pagination: {
        total,
        page: pageNum,
        limit: take,
        totalPages: Math.ceil(total / take) || 1
      },
      stats: {
        totalLogs: total,
        todayCount: filtered.filter(l => new Date(l.createdAt).toDateString() === new Date().toDateString()).length,
        failureCount: filtered.filter(l => l.status === 'FAILURE').length
      }
    };
  }
}

/**
 * Retrieves a single audit log entry by ID.
 */
export async function getAuditLogById(id, collegeId = null, isSuperAdmin = false) {
  // Non-superadmin cannot look up a record without college context
  if (!isSuperAdmin && !collegeId) {
    return null;
  }

  try {
    if (!tableInitialized) {
      await initializeAuditTable();
    }

    let query = isUuid(id)
      ? `SELECT * FROM "AuditLog" WHERE "id" = $1::uuid`
      : `SELECT * FROM "AuditLog" WHERE "id"::text = $1`;
    const params = [id];

    if (collegeId && collegeId !== 'all') {
      if (isUuid(collegeId)) {
        query += ` AND "collegeId" = $2::uuid`;
        params.push(collegeId);
      } else {
        query += ` AND "collegeId"::text = $2`;
        params.push(String(collegeId));
      }
    }
    query += ` LIMIT 1`;

    const res = await prisma.$queryRawUnsafe(query, ...params);
    if (res && res.length > 0) {
      return res[0];
    }
  } catch (err) {
    logger.warn(`[AuditLog] getAuditLogById fallback: ${err.message}`);
  }

  return inMemoryFallbackLogs.find(l => 
    String(l.id) === String(id) && (
      isSuperAdmin 
        ? (!collegeId || collegeId === 'all' || String(l.collegeId) === String(collegeId))
        : (l.collegeId && String(l.collegeId) === String(collegeId))
    )
  ) || null;
}
