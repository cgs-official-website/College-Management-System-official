import crypto from 'crypto';
import { redis } from '../../lib/cache.js';
import dns from 'dns';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { addDomainSchema, domainIdParamSchema, updateDomainSettingsSchema } from './domains.schema.js';
import {
  invalidateVerifiedDomainsCache,
  getVerifiedDomainsForCollege,
  invalidateCollegeDomainSettingsCache,
  getCollegeDomainSettings,
  EXEMPT_ROLES,
} from './domains.service.js';

const { resolveTxt } = dns.promises;

/**
 * Format domain record with DNS setup instructions
 */
function formatDomainResponse(domainRecord) {
  return {
    id: domainRecord.id,
    collegeId: domainRecord.collegeId,
    domain: domainRecord.domain,
    verificationToken: domainRecord.verificationToken,
    status: domainRecord.status,
    verifiedAt: domainRecord.verifiedAt,
    createdAt: domainRecord.createdAt,
    updatedAt: domainRecord.updatedAt,
    instructions: {
      recordType: 'TXT',
      host: `_zuna-verify.${domainRecord.domain}`,
      value: `zuna-verify=${domainRecord.verificationToken}`,
      description: `Add a DNS TXT record with Host/Name: _zuna-verify.${domainRecord.domain} and Value: zuna-verify=${domainRecord.verificationToken}`,
    },
  };
}

/**
 * GET /api/v1/domains
 * Retrieve all registered email domains for the current college.
 */
export async function getDomains(req, res) {
  const collegeId = req.user?.collegeId || req.tenant?.collegeId;
  if (!collegeId) {
    return res.status(400).json({ success: false, message: 'College tenant context is required.' });
  }

  const domains = await prisma.collegeDomain.findMany({
    where: { collegeId },
    orderBy: { createdAt: 'desc' },
  });

  return res.status(200).json({
    success: true,
    data: domains.map(formatDomainResponse),
  });
}

/**
 * POST /api/v1/domains
 * Add a new domain to be verified for the current college.
 */
export async function addDomain(req, res) {
  const collegeId = req.user?.collegeId || req.tenant?.collegeId;
  if (!collegeId) {
    return res.status(400).json({ success: false, message: 'College tenant context is required.' });
  }

  const validatedData = addDomainSchema.parse(req.body);
  const normalizedDomain = validatedData.domain.toLowerCase().trim();

  // 1. Check if domain is already globally verified by another college
  const alreadyVerifiedGlobally = await prisma.collegeDomain.findFirst({
    where: {
      domain: normalizedDomain,
      status: 'VERIFIED',
    },
  });

  if (alreadyVerifiedGlobally) {
    return res.status(409).json({
      success: false,
      message: 'This domain is already verified and claimed by another institution.',
    });
  }

  // 2. Check if current college already registered this domain
  const existingForThisCollege = await prisma.collegeDomain.findUnique({
    where: {
      collegeId_domain: {
        collegeId,
        domain: normalizedDomain,
      },
    },
  });

  if (existingForThisCollege) {
    return res.status(409).json({
      success: false,
      message:
        existingForThisCollege.status === 'VERIFIED'
          ? 'This domain is already verified for your college.'
          : 'This domain has already been added and is pending verification.',
      data: formatDomainResponse(existingForThisCollege),
    });
  }

  // 3. Generate secure verification token
  const verificationToken = crypto.randomBytes(16).toString('hex');

  // 4. Create pending domain record
  const newDomain = await prisma.collegeDomain.create({
    data: {
      collegeId,
      domain: normalizedDomain,
      verificationToken,
      status: 'PENDING',
    },
  });

  return res.status(201).json({
    success: true,
    message: 'Domain added successfully. Please configure the DNS TXT record.',
    data: formatDomainResponse(newDomain),
  });
}

/**
 * POST /api/v1/domains/:id/verify
 * Performs DNS TXT resolution to verify ownership of the domain.
 */
export async function verifyDomain(req, res) {
  const collegeId = req.user?.collegeId || req.tenant?.collegeId;
  if (!collegeId) {
    return res.status(400).json({ success: false, message: 'College tenant context is required.' });
  }

  const { id } = domainIdParamSchema.parse(req.params);

  // 1. Scope domain lookup strictly by tenant
  const domainRecord = await prisma.collegeDomain.findFirst({
    where: { id, collegeId },
  });

  if (!domainRecord) {
    return res.status(404).json({
      success: false,
      message: 'Domain record not found.',
    });
  }

  // 2. Idempotency: If already verified, return success immediately
  if (domainRecord.status === 'VERIFIED') {
    return res.status(200).json({
      success: true,
      message: 'Domain is already verified.',
      data: formatDomainResponse(domainRecord),
    });
  }

  // 3. Rate limiting with Redis (Max 5 attempts per domain per 60 seconds)
  const rateLimitKey = `domain:verify:rate:${domainRecord.id}`;
  if (redis && redis.status === 'ready') {
    try {
      const attempts = await redis.incr(rateLimitKey);
      if (attempts === 1) {
        await redis.expire(rateLimitKey, 60);
      }
      if (attempts > 5) {
        const ttl = await redis.ttl(rateLimitKey);
        return res.status(429).json({
          success: false,
          message: `Too many verification attempts. Please wait ${ttl > 0 ? ttl : 60} seconds before trying again.`,
        });
      }
    } catch (redisErr) {
      logger?.warn?.(`[DomainVerification] Redis rate limiter error (fail-open): ${redisErr.message}`);
    }
  }

  // 4. Check global uniqueness constraint before verifying
  const verifiedElsewhere = await prisma.collegeDomain.findFirst({
    where: {
      domain: domainRecord.domain,
      status: 'VERIFIED',
      NOT: { id: domainRecord.id },
    },
  });

  if (verifiedElsewhere) {
    return res.status(409).json({
      success: false,
      message: 'This domain has already been verified and claimed by another institution.',
    });
  }

  // 5. Query DNS TXT record
  const txtHost = `_zuna-verify.${domainRecord.domain}`;
  const expectedValue = `zuna-verify=${domainRecord.verificationToken}`;
  let records = [];

  try {
    records = await resolveTxt(txtHost);
  } catch (dnsErr) {
    // Gracefully handle common DNS errors (ENOTFOUND, ENODATA, ESERVFAIL, etc.)
    console.log(`[DomainVerification] DNS lookup failed for ${txtHost}: ${dnsErr.code || dnsErr.message}`);
    return res.status(400).json({
      success: false,
      message: 'TXT record could not be found yet. DNS changes can take a few minutes to propagate across the internet. Please ensure your DNS TXT record is saved and try again.',
    });
  }

  // Flatten and join any multi-segment chunks in TXT records
  const flatRecords = records.map((entry) => (Array.isArray(entry) ? entry.join('') : String(entry)));
  const isMatchFound = flatRecords.some((txt) => txt.trim() === expectedValue.trim());

  if (!isMatchFound) {
    return res.status(400).json({
      success: false,
      message: 'TXT record found, but the verification value did not match. Please verify the value in your DNS provider.',
      expectedHost: txtHost,
      expectedValue,
    });
  }

  // 6. Match confirmed! Update status to VERIFIED
  try {
    const updatedDomain = await prisma.collegeDomain.update({
      where: { id: domainRecord.id },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date(),
      },
    });

    await invalidateVerifiedDomainsCache(collegeId);

    return res.status(200).json({
      success: true,
      message: 'Domain verified successfully!',
      data: formatDomainResponse(updatedDomain),
    });
  } catch (err) {
    // In case partial unique index was violated concurrently
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'This domain was concurrently verified by another institution.',
      });
    }
    throw err;
  }
}

/**
 * DELETE /api/v1/domains/:id
 * Remove a domain from the college.
 */
export async function deleteDomain(req, res) {
  const collegeId = req.user?.collegeId || req.tenant?.collegeId;
  if (!collegeId) {
    return res.status(400).json({ success: false, message: 'College tenant context is required.' });
  }

  const { id } = domainIdParamSchema.parse(req.params);

  // Strictly scope by tenant
  const domain = await prisma.collegeDomain.findFirst({
    where: { id, collegeId },
  });

  if (!domain) {
    return res.status(404).json({
      success: false,
      message: 'Domain record not found.',
    });
  }

  await prisma.collegeDomain.delete({
    where: { id },
  });

  await invalidateVerifiedDomainsCache(collegeId);

  return res.status(200).json({
    success: true,
    message: 'Domain deleted successfully.',
  });
}

/**
 * GET /api/v1/domains/settings
 * Retrieve domain settings (allowPersonalEmail) for the current college.
 */
export async function getDomainSettings(req, res) {
  const collegeId = req.user?.collegeId || req.tenant?.collegeId;
  if (!collegeId) {
    return res.status(400).json({ success: false, message: 'College tenant context is required.' });
  }

  const settings = await getCollegeDomainSettings(collegeId);

  return res.status(200).json({
    success: true,
    data: {
      allowPersonalEmail: Boolean(settings.allowPersonalEmail),
    },
  });
}

/**
 * PATCH /api/v1/domains/settings
 * Update domain settings (allowPersonalEmail) for the current college.
 */
export async function updateDomainSettings(req, res) {
  const collegeId = req.user?.collegeId || req.tenant?.collegeId;
  if (!collegeId) {
    return res.status(400).json({ success: false, message: 'College tenant context is required.' });
  }

  const parsed = updateDomainSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: parsed.error.issues?.[0]?.message || 'Invalid settings payload.',
      error: parsed.error.format(),
    });
  }

  const updatedCollege = await prisma.college.update({
    where: { id: collegeId },
    data: {
      allowPersonalEmail: parsed.data.allowPersonalEmail,
    },
    select: {
      id: true,
      allowPersonalEmail: true,
    },
  });

  await invalidateCollegeDomainSettingsCache(collegeId);

  return res.status(200).json({
    success: true,
    message: `Personal email access has been ${updatedCollege.allowPersonalEmail ? 'allowed' : 'restricted'}.`,
    data: {
      allowPersonalEmail: updatedCollege.allowPersonalEmail,
    },
  });
}

/**
 * GET /api/v1/domains/non-compliant-users
 * Returns existing staff and students whose email does not match any verified domain.
 * Filtering is done entirely at the DB query level for 100% accurate count & pagination.
 * Excludes exempt roles (parent, superadmin, admin) and inactive/deleted accounts.
 * When allowPersonalEmail is true, exact gmail.com addresses are excluded from non-compliant audit.
 */
export async function getNonCompliantUsers(req, res) {
  // collegeId comes from tenant context only
  const collegeId = req.tenant?.collegeId;
  if (!collegeId) {
    return res.status(400).json({ success: false, message: 'College tenant context is required.' });
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  const search = req.query.search ? String(req.query.search).trim() : null;
  const roleFilter = req.query.role ? String(req.query.role).trim().toLowerCase() : null;

  // 1. Fetch verified domains and domain settings
  const [verifiedDomains, settings] = await Promise.all([
    getVerifiedDomainsForCollege(collegeId),
    getCollegeDomainSettings(collegeId),
  ]);

  // If college has 0 verified domains, no users are non-compliant
  if (!verifiedDomains || verifiedDomains.length === 0) {
    return res.status(200).json({
      success: true,
      data: {
        users: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
        verifiedDomains: [],
        allowPersonalEmail: Boolean(settings.allowPersonalEmail),
      },
    });
  }

  // 2. Build DB query conditions
  // NOT endsWith '@d' AND NOT endsWith '.d' (case-insensitive) for every verified domain
  const domainExclusions = verifiedDomains.map((vd) => ({
    NOT: [
      { email: { endsWith: `@${vd}`, mode: 'insensitive' } },
      { email: { endsWith: `.${vd}`, mode: 'insensitive' } },
    ],
  }));

  // If allowPersonalEmail is true, exclude exact @gmail.com from non-compliant list
  const personalEmailExclusion = settings.allowPersonalEmail
    ? [
        {
          NOT: [
            { email: { endsWith: '@gmail.com', mode: 'insensitive' } },
          ],
        },
      ]
    : [];

  let roleCondition;
  if (roleFilter === 'student') {
    roleCondition = { equals: 'student' };
  } else if (roleFilter === 'staff') {
    roleCondition = { notIn: [...EXEMPT_ROLES, 'student'] };
  } else {
    roleCondition = { notIn: EXEMPT_ROLES };
  }

  const where = {
    collegeId,
    accountStatus: 'active',
    role: roleCondition,
    AND: [
      ...domainExclusions,
      ...personalEmailExclusion,
      ...(search
        ? [
            {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            },
          ]
        : []),
    ],
  };

  // 3. Query DB with pagination
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
        prisma.user.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        accountStatus: true,
        createdAt: true,
        teacherProfile: { select: { designation: true } },
        customRole: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const formattedUsers = users.map(({ teacherProfile, customRole, ...u }) => ({
    ...u,
    designation: teacherProfile?.designation || customRole?.name || null,
  }));

  return res.status(200).json({
    success: true,
    data: {
      users: formattedUsers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      verifiedDomains,
      allowPersonalEmail: Boolean(settings.allowPersonalEmail),
    },
  });
}

