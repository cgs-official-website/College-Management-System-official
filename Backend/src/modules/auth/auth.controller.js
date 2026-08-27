import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma, logger } from '../../server.js';
import { redis, redisKeys } from '../../lib/cache.js';
import { 
  loginSchema, 
  registerAdminSchema, 
  refreshTokenSchema, 
  studentRegisterSchema,
  forgotPasswordSchema, 
  resetPasswordSchema 
} from './auth.schema.js';
import { sendDynamicMail } from '../../services/email/email.service.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';

export const login = async (req, res) => {
  try {
    const validated = loginSchema.parse(req.body);
    const rawEmail = (validated.email || validated.identifier || '').trim();
    const password = validated.password;
    const collegeSlug = validated.collegeSlug;

    // Reject non-email formats (e.g. Admission Numbers are not accepted for login)
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail);
    if (!isEmail) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password. Please sign in using your registered email address.' }
      });
    }

    const normalizedEmail = rawEmail.toLowerCase();
    let user = null;

    if (collegeSlug) {
      const college = await prisma.college.findUnique({
        where: { slug: collegeSlug.trim().toLowerCase() }
      });
      if (!college) {
        return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
      }
      user = await prisma.user.findFirst({
        where: { email: normalizedEmail, collegeId: college.id },
        include: {
          college: true,
          studentProfile: true
        }
      });
    } else {
      user = await prisma.user.findFirst({
        where: { email: normalizedEmail },
        include: {
          college: true,
          studentProfile: true
        }
      });
    }

    // Generic 401 on missing user or invalid password (zero account enumeration)
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

export const registerAdmin = async (req, res) => {
  try {
    const data = registerAdminSchema.parse(req.body);
    const email = data.adminEmail.toLowerCase().trim();

    // Check if an account with this email already exists
    const existingUser = await prisma.user.findFirst({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: { code: 'EMAIL_ALREADY_IN_USE', message: 'An account with this email address is already registered.' }
      });
    }

    // Determine unique college slug
    let baseSlug = (data.slug || data.collegeName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    if (!baseSlug || baseSlug.length < 2) {
      baseSlug = 'college';
    }

    let finalSlug = baseSlug;
    const existingSlug = await prisma.college.findUnique({
      where: { slug: finalSlug }
    });

    if (existingSlug) {
      finalSlug = `${baseSlug}-${crypto.randomBytes(3).toString('hex')}`;
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const adminName = (data.name || `${data.collegeName} Administrator`).trim();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create College in PENDING state awaiting Super Admin approval
      const college = await tx.college.create({
        data: {
          name: data.collegeName.trim(),
          slug: finalSlug,
          status: 'pending',
          aicteNumber: data.aicteNumber || null,
          ugcCode: data.ugcRecognition || null,
          affiliationCode: data.affiliationCode || null,
          logoUrl: data.logoUrl || null
        }
      });

      // 2. Create Admin User
      const adminUser = await tx.user.create({
        data: {
          collegeId: college.id,
          email,
          name: adminName,
          passwordHash,
          role: 'admin',
          accountStatus: 'active'
        }
      });

      // 3. Create Default Billing Subscription
      await tx.billingSubscription.create({
        data: {
          collegeId: college.id,
          planTier: 'Enterprise',
          pricePerStudent: 0,
          maxStudents: 5000,
          storageLimitGb: 50,
          status: 'pending',
          trialExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });

      return { college, adminUser };
    });

    // Seed Redis status cache to 'pending'
    if (redis && redis.status === 'ready') {
      try {
        await redis.set(`college_status:${result.college.id}`, 'pending', 'EX', 3600);
      } catch (err) {}
    }

    const accessToken = jwt.sign(
      { userId: result.adminUser.id, collegeId: result.college.id, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: result.adminUser.id },
      REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    if (redis && redis.status === 'ready') {
      try {
        await redis.set(redisKeys.refreshToken(tokenHash), JSON.stringify({ userId: result.adminUser.id }), 'EX', 7 * 24 * 60 * 60);
      } catch (cacheErr) {
        logger.warn(`[warn] Failed to cache refresh token in Redis: ${cacheErr.message}`);
      }
    }

    await prisma.refreshToken.create({
      data: {
        userId: result.adminUser.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    logger.info(`[info] College ${result.college.name} (id=${result.college.id}) registered with Admin ${result.adminUser.email}`);

    return res.status(201).json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        college: {
          id: result.college.id,
          name: result.college.name,
          slug: result.college.slug,
          status: result.college.status
        },
        user: {
          id: result.adminUser.id,
          role: result.adminUser.role,
          collegeId: result.college.id,
          email: result.adminUser.email,
          name: result.adminUser.name
        }
      }
    });
  } catch (error) {
    logger.warn(`[warn] College registration failed: ${error.message}`);
    return res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const getStudentRegistrationInfo = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Registration token is required' } });
    }

    // Compute SHA-256 hash of the raw token
    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

    const link = await prisma.studentRegistrationLink.findUnique({
      where: { tokenHash },
      include: { college: true }
    });

    if (!link || !link.isActive) {
      return res.status(404).json({ success: false, error: { code: 'LINK_INVALID', message: 'Student registration link is invalid or has been disabled' } });
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      return res.status(410).json({ success: false, error: { code: 'LINK_EXPIRED', message: 'Student registration link has expired' } });
    }

    if (link.college.status === 'rejected') {
      return res.status(403).json({ success: false, error: { code: 'COLLEGE_REJECTED', message: 'College registration was rejected' } });
    }

    res.json({
      success: true,
      data: {
        collegeId: link.collegeId,
        collegeName: link.college.name,
        collegeSlug: link.college.slug,
        logoUrl: link.college.logoUrl || null,
        expiresAt: link.expiresAt
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const studentRegister = async (req, res) => {
  try {
    const payload = studentRegisterSchema.parse(req.body);
    const { token, admissionNumber, email, firstName, lastName, phone, password } = payload;

    // 1. Hash raw token with SHA-256 and look up registration link
    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const link = await prisma.studentRegistrationLink.findUnique({
      where: { tokenHash },
      include: { college: true }
    });

    if (!link || !link.isActive) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_REGISTRATION_TOKEN', message: 'Invalid or deactivated registration link' }
      });
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        error: { code: 'REGISTRATION_LINK_EXPIRED', message: 'Registration link has expired' }
      });
    }

    const collegeId = link.collegeId;

    // 2. Find pre-created student record for this college
    const student = await prisma.student.findFirst({
      where: {
        collegeId,
        admissionNumber: { equals: admissionNumber.trim(), mode: 'insensitive' },
        deletedAt: null
      },
      include: {
        user: true
      }
    });

    if (!student) {
      return res.status(400).json({
        success: false,
        error: { code: 'STUDENT_RECORD_NOT_FOUND', message: 'No student record found matching the provided admission number in this college.' }
      });
    }

    // 3. Email verification against existing student record
    const normalizedEmail = email.trim().toLowerCase();
    const existingStudentEmail = (student.emailId || student.user?.email || '').trim().toLowerCase();

    if (existingStudentEmail && existingStudentEmail !== normalizedEmail) {
      return res.status(400).json({
        success: false,
        error: { code: 'EMAIL_MISMATCH', message: 'The provided email does not match our official student records.' }
      });
    }

    // 4. Duplicate registration guard: Check if user is already registered and active
    if (student.user && student.user.accountStatus === 'active') {
      return res.status(409).json({
        success: false,
        error: { code: 'ALREADY_REGISTERED', message: 'This student account has already been registered. Please log in with your credentials.' }
      });
    }

    // 5. Atomic transaction to create/activate User and link Student
    const passwordHash = await bcrypt.hash(password, 10);
    const fullName = `${firstName.trim()} ${lastName ? lastName.trim() : ''}`.trim();

    const result = await prisma.$transaction(async (tx) => {
      let user = null;
      if (student.userId) {
        user = await tx.user.update({
          where: { id: student.userId },
          data: {
            email: normalizedEmail,
            name: fullName,
            passwordHash,
            accountStatus: 'active',
            role: 'student'
          }
        });
      } else {
        const existingUser = await tx.user.findFirst({
          where: { email: normalizedEmail, collegeId }
        });

        if (existingUser) {
          user = await tx.user.update({
            where: { id: existingUser.id },
            data: {
              name: fullName,
              passwordHash,
              accountStatus: 'active',
              role: 'student'
            }
          });
        } else {
          user = await tx.user.create({
            data: {
              email: normalizedEmail,
              name: fullName,
              collegeId,
              passwordHash,
              role: 'student',
              accountStatus: 'active'
            }
          });
        }
      }

      // Update student record with userId and contact details
      const updatedStudent = await tx.student.update({
        where: { id: student.id },
        data: {
          userId: user.id,
          emailId: normalizedEmail,
          studentMobile: phone || student.studentMobile,
          emergencyContact: phone || student.emergencyContact
        }
      });

      return { user, student: updatedStudent };
    });

    logger.info(`[info] Student ${normalizedEmail} (admission=${student.admissionNumber}, collegeId=${collegeId}) registered successfully`);

    res.status(201).json({
      success: true,
      message: 'Registration completed successfully! You can now log in using your Admission Number or Email.',
      data: {
        admissionNumber: student.admissionNumber,
        email: normalizedEmail
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

export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { 
        college: true,
        studentProfile: {
          include: {
            department: true,
            section: true,
            course: true
          }
        },
        teacherProfile: {
          include: {
            department: true
          }
        },
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

    const { passwordHash, ...safeUser } = user;
    safeUser.collegeStatus = user.college?.status || null;
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

export const forgotPassword = async (req, res) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: { email }
    });

    if (!user) {
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    const secret = JWT_SECRET + user.passwordHash;
    const token = jwt.sign({ userId: user.id, email: user.email }, secret, { expiresIn: '15m' });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${token}&id=${user.id}`;
    
    await sendDynamicMail({
      to: user.email,
      templateName: 'Password Reset',
      variables: {
        resetLink
      }
    });

    res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, userId, password } = resetPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(400).json({ success: false, error: { message: 'Invalid or expired token' } });
    }

    const secret = JWT_SECRET + user.passwordHash;
    
    try {
      jwt.verify(token, secret);
    } catch (err) {
      return res.status(400).json({ success: false, error: { message: 'Invalid or expired token' } });
    }

    const newPasswordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash }
    });

    res.json({ success: true, message: 'Password has been successfully reset.' });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};
