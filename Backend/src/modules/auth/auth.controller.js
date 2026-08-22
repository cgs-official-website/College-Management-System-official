import bcrypt from 'bcryptjs';
// Trigger backend restart for Prisma Client update - Part 2
import jwt from 'jsonwebtoken';
import { prisma } from '../../server.js';
import { redis } from '../../lib/cache.js';
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
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.accountStatus !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    if (user.role !== 'superadmin' && user.college) {
      if (user.college.status === 'pending') {
        return res.status(403).json({ error: { code: 'COLLEGE_PENDING_APPROVAL', message: 'Your college is pending Superadmin approval.' } });
      }
      if (user.college.status === 'rejected') {
        return res.status(403).json({ error: { code: 'COLLEGE_REJECTED', message: 'Your college registration was rejected.' } });
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

    // Store hashed refresh token for quick revocation lookups
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    
    if (redis.status === 'ready') {
      try {
        await redis.set(`refresh:${user.id}`, tokenHash, 'EX', 7 * 24 * 60 * 60);
      } catch (cacheErr) {
        // silent fallback
      }
    }

    // Store in DB for long-term audit
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

    res.json({ data: { accessToken, refreshToken, user: { id: user.id, role: user.role, collegeId: user.collegeId } } });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};

export const registerAdmin = async (req, res) => {
  try {
    const data = registerAdminSchema.parse(req.body);
    
    // Ensure unique slug by appending random string
    const uniqueSlug = `${data.slug}-${Math.random().toString(36).substring(2, 8)}`;
    
    // Transaction to atomically create College and Admin
    const result = await prisma.$transaction(async (tx) => {
      const college = await tx.college.create({
        data: {
          name: data.collegeName,
          slug: uniqueSlug,
          status: 'pending'
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

    res.status(201).json({ data: result });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { college: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Exclude password hash
    const { passwordHash, ...safeUser } = user;
    res.json({ data: safeUser });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
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
      // Optionally update teacherProfile if it had name fields
    });

    res.json({ success: true, message: 'Setup completed successfully' });
  } catch (error) {
    console.error('completeStaffSetup Error:', error);
    res.status(400).json({ success: false, error: { message: error.message || 'Invalid or expired token' } });
  }
};
