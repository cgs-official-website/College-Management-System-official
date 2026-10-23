import { prisma } from '../../lib/prisma.js';
import { redis } from '../../lib/cache.js';
import { logger } from '../../lib/logger.js';

/**
 * Invalidate the Redis cache for verified domains of a college.
 * Fail-safe: logs warnings on failures or timeouts without throwing.
 */
export async function invalidateVerifiedDomainsCache(collegeId) {
  if (!collegeId) return;
  const cacheKey = `college:verified_domains:${collegeId}`;
  if (redis && redis.status === 'ready') {
    try {
      const redisPromise = redis.del(cacheKey).catch((err) => {
        logger.warn(`[DomainCache] Redis del failed for college ${collegeId}: ${err.message}`);
      });
      await Promise.race([
        redisPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis del timeout')), 250)),
      ]);
    } catch (err) {
      logger.warn(`[DomainCache] Invalidation timeout/failure for college ${collegeId} (${err.message}). Continuing fail-open.`);
    }
  }
}

/**
 * Fetch all VERIFIED domains for a given college.
 * Checks optional Redis cache first with a 250ms timeout, falling back to DB silently.
 */
export async function getVerifiedDomainsForCollege(collegeId) {
  if (!collegeId) return [];

  const cacheKey = `college:verified_domains:${collegeId}`;

  // 1. Try cache if Redis is ready (with 250ms timeout and catch on losing promise)
  if (redis && redis.status === 'ready') {
    try {
      const redisPromise = redis.get(cacheKey).catch((err) => {
        logger.warn(`[DomainCache] Redis get failed for college ${collegeId}: ${err.message}`);
        return null;
      });
      const cached = await Promise.race([
        redisPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis get timeout')), 250)),
      ]);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      logger.warn(`[DomainCache] Cache read skipped (${err.message}). Falling back to DB.`);
    }
  }

  // 2. Fetch from DB
  const records = await prisma.collegeDomain.findMany({
    where: {
      collegeId,
      status: 'VERIFIED',
    },
    select: { domain: true },
  });

  const domains = records.map((r) => r.domain.trim().toLowerCase());

  // 3. Cache result for 5 minutes if Redis is available
  if (redis && redis.status === 'ready' && domains.length > 0) {
    try {
      const writePromise = redis.set(cacheKey, JSON.stringify(domains), 'EX', 300).catch((err) => {
        logger.warn(`[DomainCache] Redis set error for college ${collegeId}: ${err.message}`);
      });
      await Promise.race([
        writePromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis set timeout')), 250)),
      ]);
    } catch (_) {
      // Silently continue
    }
  }

  return domains;
}

export const EXEMPT_ROLES = ['parent', 'superadmin'];

export function isExemptRole(role) {
  const normalizedRole = (role || '').trim().toLowerCase();
  return EXEMPT_ROLES.includes(normalizedRole);
}

/**
 * Validates if an email's domain is allowed for the specified college.
 *
 * Rules:
 * - Exempt roles: PARENT and SUPERADMIN.
 * - If college has 0 VERIFIED domains -> allow (backward compatible).
 * - Match on dot boundary only (e.g. cse.loyola.edu allowed for loyola.edu, but evilloyola.edu blocked).
 * - Handles plus-addressing (user+tag@loyola.edu).
 *
 * @param {string} collegeId - College UUID
 * @param {string} email - Raw email address
 * @param {string} [role] - User role
 * @returns {Promise<{ allowed: boolean, code?: string, message?: string, allowedDomains?: string[] }>}
 */
export async function isEmailAllowedForCollege(collegeId, email, role = null) {
  // 1. Exempt roles: PARENT and SUPERADMIN
  if (isExemptRole(role)) {
    return { allowed: true, reason: 'EXEMPT_ROLE' };
  }

  if (!email || typeof email !== 'string') {
    return {
      allowed: false,
      code: 'INVALID_EMAIL',
      message: 'A valid email address is required.',
    };
  }

  const cleanEmail = email.trim().toLowerCase();
  const atParts = cleanEmail.split('@');

  // Must have exactly one @ and valid local/domain parts
  if (atParts.length !== 2 || !atParts[0] || !atParts[1]) {
    return {
      allowed: false,
      code: 'INVALID_EMAIL',
      message: 'Invalid email address format.',
    };
  }

  const emailDomain = atParts[1].trim();

  // 2. Get verified domains for this college
  const verifiedDomains = await getVerifiedDomainsForCollege(collegeId);

  // If college has 0 verified domains, skip enforcement
  if (!verifiedDomains || verifiedDomains.length === 0) {
    return { allowed: true, reason: 'NO_VERIFIED_DOMAINS' };
  }

  // 3. Match on dot boundary only
  const isMatch = verifiedDomains.some((vd) => {
    const normVd = vd.trim().toLowerCase();
    return emailDomain === normVd || emailDomain.endsWith(`.${normVd}`);
  });

  if (!isMatch) {
    const allowedList = verifiedDomains.map((d) => `@${d}`).join(', ');
    return {
      allowed: false,
      code: 'EMAIL_DOMAIN_NOT_ALLOWED',
      message: `Email domain '@${emailDomain}' is not allowed for this institution. Allowed domains: ${allowedList}`,
      allowedDomains: verifiedDomains,
    };
  }

  return { allowed: true, allowedDomains: verifiedDomains };
}

/**
 * Asserts that an email is allowed for a college.
 * Throws a 403 Forbidden error if domain restriction is violated.
 */
export async function assertEmailAllowedForCollege(collegeId, email, role = null) {
  const check = await isEmailAllowedForCollege(collegeId, email, role);
  if (!check.allowed) {
    const error = new Error(check.message || 'Email domain is not allowed for this institution.');
    error.statusCode = 403;
    error.code = check.code || 'EMAIL_DOMAIN_NOT_ALLOWED';
    error.allowedDomains = check.allowedDomains;
    throw error;
  }
  return check;
}
