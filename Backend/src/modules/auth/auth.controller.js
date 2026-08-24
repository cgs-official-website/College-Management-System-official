import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma, logger } from '../../server.js';
import { redis, redisKeys } from '../../lib/cache.js';
import { loginSchema, registerAdminSchema, refreshTokenSchema } from './auth.schema.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';

export const login = async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: { email },
      include: {
        college: true
      }
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }

    if (user.accountStatus !== 'active') {
      return res.status(403).json({ success: false, error: { code: 'ACCOUNT_INACTIVE', message: 'Account is not active' } });
    }

    if (user.role !== 'superadmin' && user.college) {
      if (user.college.status === 'rejected') {
        return res.status(403).json({ success: false, error: { code: 'COLLEGE_REJECTED', message: 'Your college registration was rejected.' } });
      }
    }

    const accessToken = jwt.sign(
      { userId: user.id, collegeId: user.collegeId, role: user.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Store deterministic SHA-256 hash for database and Redis lookups
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    if (redis.status === 'ready') {
      try {
        await redis.set(redisKeys.refreshToken(tokenHash), JSON.stringify({ userId: user.id }), 'EX', 7 * 24 * 60 * 60);
      } catch (cacheErr) {
        logger.warn(`[warn] Failed to cache refresh token in Redis: ${cacheErr.message}`);
      }
    }

    // Store in DB for durable session management & audit
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    logger.info(`[info] User ${user.email} (id=${user.id}, role=${user.role}) logged in successfully`);
    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          role: user.role,
          collegeId: user.collegeId,
          email: user.email,
          name: user.name
        }
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken: rawRefreshToken } = refreshTokenSchema.parse(req.body);

    // 1. Verify Refresh Token JWT signature & expiration
    let decoded;
    try {
      decoded = jwt.verify(rawRefreshToken, REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token is expired or invalid' }
      });
    }

    // 2. Hash token for deterministic lookup
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');

    // 3. Verify in PostgreSQL (Durable source of truth)
    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: { college: true }
        }
      }
    });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        error: { code: 'REVOKED_REFRESH_TOKEN', message: 'Refresh token has been revoked or expired' }
      });
    }

    const user = storedToken.user;
    if (!user || user.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCOUNT_INACTIVE', message: 'Account is disabled or deleted' }
      });
    }

    if (user.role !== 'superadmin' && user.college && user.college.status === 'rejected') {
      return res.status(403).json({
        success: false,
        error: { code: 'COLLEGE_REJECTED', message: 'College registration was rejected' }
      });
    }

    // 4. Issue new fresh access token (15m)
    const newAccessToken = jwt.sign(
      { userId: user.id, collegeId: user.collegeId, role: user.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    logger.info(`[info] Refreshed access token for user ${user.email} (id=${user.id})`);
    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: rawRefreshToken
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const logout = async (req, res) => {
  try {
    const { refreshToken: rawRefreshToken } = req.body || {};
    
    if (rawRefreshToken) {
      const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
      await prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { revokedAt: new Date() }
      });

      if (redis.status === 'ready') {
        await redis.del(redisKeys.refreshToken(tokenHash)).catch(() => {});
      }
    }

    // If access token had a jti, blacklist it in Redis
    if (req.user?.jti && redis.status === 'ready') {
      await redis.set(redisKeys.revokedToken(req.user.jti), 'true', 'EX', 15 * 60).catch(() => {});
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const registerAdmin = async (req, res) => {
  try {
    const data = registerAdminSchema.parse(req.body);
    
    // Ensure unique slug by appending random string
    const uniqueSlug = `${data.slug}-${Math.random().toString(36).substring(2, 8)}`;
    
    // Transaction to atomically create College and Admin
    const result = await prisma.$transaction(async (tx) => {
      // Generate custom ZUNAC ID based on count
      const count = await tx.college.count();
      const nextId = count + 1;
      const registrationNo = `ZUNAC${nextId.toString().padStart(3, '0')}`;

      const college = await tx.college.create({
        data: {
          name: data.collegeName,
          slug: uniqueSlug,
          status: 'pending',
          registrationNo
        }
      });

      const passwordHash = await bcrypt.hash(data.password, 10);
      const admin = await tx.user.create({
        data: {
          collegeId: college.id,
          email: data.adminEmail,
          passwordHash,
          role: 'admin',
          accountStatus: 'active'
        }
      });

      return { college, admin };
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { 
        college: true,
        customRole: {
          include: {
            permissions: {
              include: {
                module: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    }

    // Exclude password hash
    const { passwordHash, ...safeUser } = user;
    res.json({ success: true, data: safeUser });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const verifyStaffSetup = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ success: false, error: { message: 'Token is required' } });

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'staff-setup') return res.status(400).json({ success: false, error: { message: 'Invalid token type' } });

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        teacherProfile: { include: { department: true } }
      }
    });

    if (!user) {
      return res.status(400).json({ success: false, error: { message: 'User does not exist' } });
    }

    res.json({
      success: true,
      data: {
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.teacherProfile?.department?.name,
        employeeId: user.teacherProfile?.id
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: 'Invalid or expired token' } });
  }
};

export const completeStaffSetup = async (req, res) => {
  try {
    const { token, password, firstName, lastName } = req.body;
    if (!token || !password) return res.status(400).json({ success: false, error: { message: 'Token and password are required' } });

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'staff-setup') return res.status(400).json({ success: false, error: { message: 'Invalid token type' } });

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { teacherProfile: true }
    });

    if (!user) {
      return res.status(400).json({ success: false, error: { message: 'User does not exist or invalid token' } });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const fullName = `${firstName || ''} ${lastName || ''}`.trim() || user.name;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          accountStatus: 'active',
          name: fullName
        }
      });
    });

    res.json({ success: true, message: 'Setup completed successfully' });
  } catch (error) {
    console.error('completeStaffSetup Error:', error);
    res.status(400).json({ success: false, error: { message: error.message || 'Invalid or expired token' } });
  }
};
