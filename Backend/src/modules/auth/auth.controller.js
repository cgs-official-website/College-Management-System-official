import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { redis, redisKeys } from '../../lib/cache.js';
import { 
  loginSchema, 
  registerAdminSchema, 
  refreshTokenSchema, 
  studentRegisterSchema,
  studentActivationSchema,
  forgotPasswordSchema, 
  resetPasswordSchema,
  staffSetupSchema,
  teacherRegisterSchema,
} from './auth.schema.js';
import { verifyStaffSetupToken, verifyTeacherRegistrationToken, createStaffSetupToken } from './staffSetupToken.js';
import { sendDynamicMail } from '../../services/email/email.service.js';
import { getNextCollegeCode } from '../../lib/collegeCodeGenerator.js';
import { findUserWithMatchingPassword } from './auth.credentials.js';

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
    let matchingUsers = [];

    if (collegeSlug) {
      const college = await prisma.college.findUnique({
        where: { slug: collegeSlug.trim().toLowerCase() }
      });
      if (!college) {
        return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
      }
      matchingUsers = await prisma.user.findMany({
        where: { email: normalizedEmail, collegeId: college.id },
        include: {
          college: true,
          studentProfile: true
        }
      });
    } else {
      matchingUsers = await prisma.user.findMany({
        where: { email: normalizedEmail },
        include: {
          college: true,
          studentProfile: true
        }
      });
    }

    // Generic 401 on missing user or invalid password (zero account enumeration)
    const user = await findUserWithMatchingPassword(matchingUsers, password);
    if (!user) {
      return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }

    // Block login for accounts that are not active.
    // Pending students get a specific, user-friendly error code.
    if (user.accountStatus !== 'active') {
      if (user.role === 'student' && user.accountStatus === 'pending') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCOUNT_PENDING_APPROVAL',
            message: 'Your account is pending administrator approval. Please wait for the admin to activate your account.'
          }
        });
      }
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
      // Generate next sequential College Code (e.g. ZUNAC002, ZUNAC003, ...)
      const registrationNo = await getNextCollegeCode(tx);

      // Sanitize affiliationType to valid Prisma enum or null
      const validAffiliationTypes = ['AUTONOMOUS', 'UNIVERSITY'];
      const affiliationType = validAffiliationTypes.includes(data.affiliationType) ? data.affiliationType : null;
      const logoUrl = data.logoUrl || data.logoBase64 || null;

      // 1. Create College in PENDING state awaiting Super Admin approval
      const college = await tx.college.create({
        data: {
          name: data.collegeName.trim(),
          slug: finalSlug,
          registrationNo,
          status: 'pending',
          aicteNumber: data.aicteNumber || null,
          aicteCode: data.aicteCode || null,
          ugcCode: data.ugcCode || data.ugcRecognition || null,
          affiliationCode: data.affiliationCode || null,
          affiliationType,
          pan: data.pan || null,
          tan: data.tan || null,
          logoUrl
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
    }, { maxWait: 15000, timeout: 30000 });

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

    logger.info(`[info] College ${result.college.name} (${result.college.registrationNo}, id=${result.college.id}) registered with Admin ${result.adminUser.email}`);

    return res.status(201).json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        college: {
          id: result.college.id,
          name: result.college.name,
          slug: result.college.slug,
          registrationNo: result.college.registrationNo,
          collegeCode: result.college.registrationNo,
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
    if (error.name === 'ZodError' || error.issues || error.errors) {
      const issues = error.issues || error.errors;
      const message = Array.isArray(issues) ? issues.map(e => e.message).join('; ') : error.message;
      return res.status(400).json({ success: false, error: { message } });
    }
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
        contactEmail: link.college.contactEmail || null,
        website: link.college.website || null,
        expiresAt: link.expiresAt
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

/**
 * GET /auth/student/lookup?token=&admissionNumber=&email=
 * Called BEFORE the student sets a password.
 * Validates the college link, then fetches the admin-created student record.
 * Returns all admin-filled fields so the frontend can show them read-only.
 * The student must match by admissionNumber + email to prevent unauthorised lookups.
 */
export const getStudentLookup = async (req, res) => {
  try {
    const { token, admissionNumber, email } = req.query;

    if (!token || !admissionNumber || !email) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PARAMS', message: 'token, admissionNumber and email are required' }
      });
    }

    // 1. Validate the college registration link
    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const link = await prisma.studentRegistrationLink.findUnique({
      where: { tokenHash },
      include: { college: true }
    });

    if (!link || !link.isActive) {
      return res.status(404).json({
        success: false,
        error: { code: 'LINK_INVALID', message: 'Student registration link is invalid or has been disabled' }
      });
    }
    if (link.expiresAt && link.expiresAt < new Date()) {
      return res.status(410).json({
        success: false,
        error: { code: 'LINK_EXPIRED', message: 'Student registration link has expired' }
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedAdmission = admissionNumber.trim();

    // 2. Look up the admin-created student record
    const student = await prisma.student.findFirst({
      where: {
        collegeId: link.collegeId,
        admissionNumber: { equals: normalizedAdmission, mode: 'insensitive' },
        deletedAt: null
      },
      include: {
        user: { select: { id: true, email: true, accountStatus: true } },
        department: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
        section: { select: { id: true, name: true } }
      }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        error: { code: 'STUDENT_NOT_FOUND', message: 'No student record found with this Admission Number. Please contact your college administrator.' }
      });
    }

    // 3. Verify the email matches the admin-stored email (prevents unauthorised lookups)
    const storedEmail = (student.user?.email || student.emailId || '').trim().toLowerCase();
    if (storedEmail && storedEmail !== normalizedEmail) {
      return res.status(400).json({
        success: false,
        error: { code: 'EMAIL_MISMATCH', message: 'The email address does not match our records for this Admission Number.' }
      });
    }

    // 4. If already active, they should login instead
    if (student.user?.accountStatus === 'active') {
      return res.status(409).json({
        success: false,
        error: { code: 'ALREADY_REGISTERED', message: 'This student account has already been set up. Please log in.' }
      });
    }

    // 5. Return all admin-created details (read-only for the student)
    const custom = (typeof student.customFields === 'object' && student.customFields !== null) ? student.customFields : {};
    const firstName = custom.firstName || (student.user?.email ? student.user.email.split('@')[0] : '');
    const lastName = custom.lastName || '';
    const dob = custom.dob || custom.dateOfBirth || null;
    const gender = custom.gender || null;

    res.json({
      success: true,
      data: {
        // College info
        collegeId: link.collegeId,
        collegeName: link.college.name,
        collegeSlug: link.college.slug,
        // Student personal info (admin-created, read-only)
        admissionNumber: student.admissionNumber,
        email: storedEmail || normalizedEmail,
        firstName,
        lastName,
        phone: student.studentMobile || '',
        dob,
        gender,
        // Academic info (admin-created, read-only)
        courseId: student.courseId || null,
        courseName: student.course?.name || null,
        sectionId: student.sectionId || null,
        sectionName: student.section?.name || null,
        departmentName: student.department?.name || null,
        batchYear: student.batchYear || null,
        // Parent info (admin-created, read-only)
        parentName: student.fatherName || null,
        parentPhone: student.parentMobile || null,
        address: student.address || null,
        residenceType: student.residenceType || 'Day Scholar'
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};


export const activateStudentAccount = async (req, res) => {
  try {
    const payload = studentActivationSchema.parse(req.body);
    const normalizedEmail = payload.email.trim().toLowerCase();
    let collegeId = payload.collegeId;
    let college = null;

    if (payload.token) {
      const tokenHash = crypto.createHash('sha256').update(payload.token).digest('hex');
      const link = await prisma.studentRegistrationLink.findUnique({
        where: { tokenHash },
        include: { college: true }
      });

      if (!link || !link.isActive || (link.expiresAt && link.expiresAt < new Date())) {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_REGISTRATION_TOKEN', message: 'Invalid or expired student registration link' }
        });
      }
      if (collegeId && collegeId !== link.collegeId) {
        return res.status(400).json({
          success: false,
          error: { code: 'COLLEGE_LINK_MISMATCH', message: 'Registration link does not match the selected college' }
        });
      }

      collegeId = link.collegeId;
      college = link.college;
    } else if (collegeId) {
      college = await prisma.college.findUnique({ where: { id: collegeId } });
    }

    if (!college || !collegeId) {
      return res.status(404).json({
        success: false,
        error: { code: 'COLLEGE_NOT_FOUND', message: 'Registration college was not found' }
      });
    }
    if (college.status === 'rejected') {
      return res.status(403).json({
        success: false,
        error: { code: 'COLLEGE_REJECTED', message: 'College registration was rejected' }
      });
    }

    const student = await prisma.student.findFirst({
      where: {
        collegeId,
        admissionNumber: { equals: payload.admissionNumber.trim(), mode: 'insensitive' },
        deletedAt: null
      },
      include: { user: true }
    });

    if (!student?.user) {
      return res.status(404).json({
        success: false,
        error: { code: 'STUDENT_RECORD_NOT_FOUND', message: 'Student not found. Please contact administration.' }
      });
    }

    const officialEmail = (student.emailId || student.user.email || '').trim().toLowerCase();
    if (!officialEmail || officialEmail !== normalizedEmail) {
      return res.status(400).json({
        success: false,
        error: { code: 'EMAIL_MISMATCH', message: 'The provided email does not match our official student records.' }
      });
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const fullName = payload.firstName
      ? `${payload.firstName.trim()} ${payload.lastName || ''}`.trim()
      : undefined;
    await prisma.$transaction(async (tx) => {
      const result = await tx.user.updateMany({
        where: {
          id: student.userId,
          accountStatus: student.user.accountStatus,
          passwordHash: student.user.passwordHash
        },
        data: { passwordHash, accountStatus: 'active', role: 'student', ...(fullName ? { name: fullName } : {}) }
      });
      if (result.count !== 1) {
        const conflict = new Error('This student account is already active. Please sign in.');
        conflict.statusCode = 409;
        conflict.code = 'ALREADY_REGISTERED';
        throw conflict;
      }
    });

    return res.json({
      success: true,
      message: 'Account activated successfully. Please sign in.',
      data: {
        email: normalizedEmail,
        admissionNumber: student.admissionNumber,
        collegeSlug: college.slug
      }
    });
  } catch (error) {
    const status = error.statusCode || (error.code === 'P2002' ? 409 : 400);
    return res.status(status).json({
      success: false,
      error: { code: error.code || 'STUDENT_ACTIVATION_FAILED', message: error.message }
    });
  }
};

export const studentRegister = async (req, res) => {
  try {
    const payload = studentRegisterSchema.parse(req.body);
    const {
      token, collegeId: requestedCollegeId, admissionNumber, email,
      firstName, lastName, phone,
      dob, gender, course, section,
      parentName, parentPhone, address, residenceType,
      password
    } = payload;
    let collegeId = requestedCollegeId;
    let college = null;

    if (token) {
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
      if (requestedCollegeId && requestedCollegeId !== link.collegeId) {
        return res.status(400).json({
          success: false,
          error: { code: 'COLLEGE_LINK_MISMATCH', message: 'Registration link does not match the selected college' }
        });
      }

      collegeId = link.collegeId;
      college = link.college;
    } else if (collegeId) {
      college = await prisma.college.findUnique({
        where: { id: collegeId },
        select: { id: true, status: true }
      });
    }

    if (!college || !collegeId) {
      return res.status(404).json({
        success: false,
        error: { code: 'COLLEGE_NOT_FOUND', message: 'Registration college was not found' }
      });
    }
    if (college.status === 'rejected') {
      return res.status(403).json({
        success: false,
        error: { code: 'COLLEGE_REJECTED', message: 'College registration was rejected' }
      });
    }

    const normalizedAdmissionNumber = admissionNumber.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const student = normalizedAdmissionNumber
      ? await prisma.student.findFirst({
          where: {
            collegeId,
            admissionNumber: { equals: normalizedAdmissionNumber, mode: 'insensitive' },
            deletedAt: null
          },
          include: { user: true }
        })
      : null;

    // If an admin pre-created this admission record, verify its stored email.
    const existingStudentEmail = (student?.emailId || student?.user?.email || '').trim().toLowerCase();

    if (student && existingStudentEmail && existingStudentEmail !== normalizedEmail) {
      return res.status(400).json({
        success: false,
        error: { code: 'EMAIL_MISMATCH', message: 'The provided email does not match our official student records.' }
      });
    }

    if (student?.user?.accountStatus === 'active') {
      return res.status(409).json({
        success: false,
        error: { code: 'ALREADY_REGISTERED', message: 'This student account has already been registered. Please log in with your credentials.' }
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Student fills all fields themselves — use supplied values directly.
    const trustedFirstName = (firstName || '').trim();
    const trustedLastName = (lastName || '').trim();
    const fullName = `${trustedFirstName} ${trustedLastName}`.trim();

    const result = await prisma.$transaction(async (tx) => {
      let admissionNo = normalizedAdmissionNumber;
      if (!admissionNo) {
        await tx.$queryRaw`SELECT "id" FROM "College" WHERE "id" = ${collegeId}::uuid FOR UPDATE`;
        const admissionPrefix = `ADM${new Date().getFullYear()}`;
        const latestStudent = await tx.student.findFirst({
          where: { collegeId, admissionNumber: { startsWith: admissionPrefix } },
          orderBy: { admissionNumber: 'desc' },
          select: { admissionNumber: true }
        });
        const latestSequence = Number.parseInt(latestStudent?.admissionNumber?.slice(admissionPrefix.length) || '0', 10) || 0;
        admissionNo = `${admissionPrefix}${String(latestSequence + 1).padStart(4, '0')}`;
      }

      let department = await tx.department.findFirst({
        where: { collegeId },
        orderBy: { createdAt: 'asc' },
        select: { id: true }
      });
      if (!department) {
        department = await tx.department.create({
          data: { name: 'General Studies', code: 'GEN', collegeId },
          select: { id: true }
        });
      }

      let user = student?.userId
        ? await tx.user.findUnique({ where: { id: student.userId } })
        : await tx.user.findFirst({ where: { email: normalizedEmail, collegeId } });

      if (user) {
        const linkedStudent = await tx.student.findUnique({ where: { userId: user.id }, select: { id: true } });
        if (user.role !== 'student' || (linkedStudent && linkedStudent.id !== student?.id)) {
          const conflict = new Error('An account with this email already exists in this college.');
          conflict.statusCode = 409;
          conflict.code = 'STUDENT_EMAIL_ALREADY_EXISTS';
          throw conflict;
        }
        if (student && user.accountStatus === 'active') {
          const conflict = new Error('This student account is already registered. Please sign in.');
          conflict.statusCode = 409;
          conflict.code = 'ALREADY_REGISTERED';
          throw conflict;
        }
        user = await tx.user.update({
          where: { id: user.id },
          // Student self-registrations start as 'pending' — admin must activate
          data: { email: normalizedEmail, name: fullName, passwordHash, accountStatus: 'pending', role: 'student' }
        });
      } else {
        user = await tx.user.create({
          data: {
            email: normalizedEmail,
            name: fullName,
            collegeId,
            passwordHash,
            role: 'student',
            // Student self-registrations start as 'pending' — admin must activate
            accountStatus: 'pending'
          }
        });
      }

      const existingCustomFields = student?.customFields && typeof student.customFields === 'object'
        ? student.customFields
        : {};
      const studentData = {
        userId: user.id,
        emailId: normalizedEmail,
        // Student-supplied phone (overrides any admin placeholder)
        studentMobile: phone || student?.studentMobile || null,
        emergencyContact: student?.emergencyContact || null,
        // Student-supplied parent/guardian info
        fatherName: parentName || student?.fatherName || null,
        parentMobile: parentPhone || student?.parentMobile || null,
        address: address || student?.address || null,
        residenceType: residenceType || student?.residenceType || 'Day Scholar',
        customFields: {
          ...existingCustomFields,
          firstName: trustedFirstName,
          lastName: trustedLastName,
          // Student-supplied personal details
          dob: dob || existingCustomFields?.dob || null,
          dateOfBirth: dob || existingCustomFields?.dateOfBirth || null,
          gender: gender || existingCustomFields?.gender || null,
          // Student-supplied academic info (free-text, admin assigns official IDs later)
          courseName: course || existingCustomFields?.courseName || null,
          sectionName: section || existingCustomFields?.sectionName || null,
        }
      };

      const savedStudent = student
        ? await tx.student.update({ where: { id: student.id }, data: studentData })
        : await tx.student.create({
            data: {
              ...studentData,
              collegeId,
              departmentId: department.id,
              admissionNumber: admissionNo,
              rollNumber: admissionNo,
              batchYear: String(new Date().getFullYear())
            }
          });

      return { user, student: savedStudent, admissionNumber: admissionNo };
    });

    logger.info(`[info] Student ${normalizedEmail} (admission=${result.admissionNumber}, collegeId=${collegeId}) registered successfully`);

    res.status(201).json({
      success: true,
      message: 'Registration submitted successfully! Your account is pending administrator approval. You will be able to log in once approved.',
      data: {
        studentId: result.student.id,
        admissionNumber: result.admissionNumber,
        email: normalizedEmail
      }
    });
  } catch (error) {
    const status = error.statusCode || (error.code === 'P2002' ? 409 : 400);
    res.status(status).json({
      success: false,
      error: { code: error.code || 'STUDENT_REGISTRATION_FAILED', message: error.message }
    });
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
    const role = req.user?.role;

    // Students: return bare user only — the student portal fetches its own profile
    // via GET /student/profile. No joins needed here for auth session restore.
    if (role === 'student') {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: {
          id: true, email: true, name: true, role: true,
          collegeId: true, accountStatus: true, createdAt: true,
          college: { select: { id: true, name: true, slug: true, status: true, logoUrl: true } }
        }
      });
      if (!user) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
      return res.json({ success: true, data: { ...user, collegeStatus: user.college?.status || null } });
    }

    // Teacher/HOD/faculty: lean query — skip billing join
    if (role === 'teacher' || role === 'hod' || role === 'faculty') {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: {
          college: { select: { id: true, name: true, slug: true, status: true, logoUrl: true } },
          teacherProfile: { include: { department: true } },
          customRole: { include: { permissions: { include: { module: true } } } }
        }
      });
      if (!user) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
      const { passwordHash, ...safeUser } = user;
      return res.json({ success: true, data: { ...safeUser, collegeStatus: user.college?.status || null } });
    }

    // Admin / SuperAdmin: full query with billing
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        college: {
          include: {
            billingSubscription: { include: { subscriptionPlan: true } }
          }
        },
        customRole: { include: { permissions: { include: { module: true } } } }
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    }

    const { passwordHash, ...safeUser } = user;
    safeUser.collegeStatus = user.college?.status || null;
    if (safeUser.college?.billingSubscription?.subscriptionPlan) {
      safeUser.allowedModules = safeUser.college.billingSubscription.subscriptionPlan.modules;
    }
    res.json({ success: true, data: safeUser });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

/**
 * POST /auth/teacher-send-setup
 * Powers the OLD /register/teacher?code=<collegeId> flow.
 *
 * Teacher provides:
 *   - teacherId   : their assigned Teacher ID (e.g. "TCH011")
 *   - collegeId   : the college UUID from the URL ?code= parameter
 *
 * System:
 *   1. Finds the teacher by teacherId + collegeId
 *   2. Verifies their account is still pending_setup (not already active)
 *   3. Generates a Setup Link (staff-setup JWT with teacher.emailId)
 *   4. Emails the Setup Link to teacher.emailId (admin-registered email)
 *   5. Returns a masked email so frontend can show "sent to j***@gmail.com"
 *
 * This does NOT require a registration token — teacher proves identity by TeacherID alone.
 * The admin-registered email is used as the destination — teacher does not provide their email here.
 */
export const teacherSendSetup = async (req, res) => {
  try {
    const { teacherId, collegeId } = req.body;

    if (!teacherId?.trim() || !collegeId?.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Teacher ID and College ID are required.' }
      });
    }

    // Find teacher by teacherId + collegeId
    const teacher = await prisma.teacher.findFirst({
      where: {
        teacherId: teacherId.trim().toUpperCase(),
        collegeId: collegeId.trim(),
        deletedAt: null,
      },
      include: {
        user: { select: { id: true, accountStatus: true, passwordHash: true, email: true } },
        college: { select: { id: true, name: true, slug: true } },
      },
    });

    // Security: don't reveal whether a teacher exists or not — generic error
    if (!teacher || !teacher.user) {
      return res.status(404).json({
        success: false,
        error: { code: 'TEACHER_NOT_FOUND', message: 'No teacher found with this ID in the specified college. Please verify your Teacher ID and try again.' }
      });
    }

    // If already active, no setup needed
    if (teacher.user.accountStatus === 'active' && teacher.user.passwordHash) {
      return res.status(409).json({
        success: false,
        error: { code: 'ALREADY_ACTIVE', message: 'Your account is already set up. Please log in directly.' }
      });
    }

    // The admin-registered email — this is where the setup link is sent
    const teacherEmail = teacher.emailId || teacher.user?.email;

    if (!teacherEmail || teacherEmail.includes('@pending.local')) {
      // Admin didn't provide an email — teacher must use the new /teacher/register?token= flow
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_EMAIL_REGISTERED',
          message: 'No email address is registered for your account. Please contact your college administrator to get your registration link.',
        }
      });
    }

    // Generate the staff-setup JWT with the admin-registered email
    const setupToken = createStaffSetupToken({
      teacherRecordId: teacher.id,
      teacherId: teacher.teacherId,
      userId: teacher.user.id,
      collegeId: teacher.collegeId,
      email: teacherEmail,
    });

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
    const setupUrl = `${frontendUrl}/teacher/setup?token=${encodeURIComponent(setupToken)}`;

    logger.info(`[TEACHER-SETUP] Sending Setup Link | teacherId=${teacher.teacherId} email=${teacherEmail} college=${teacher.collegeId}`);

    // Send the Setup Link email to the admin-registered email
    const emailResult = await sendDynamicMail({
      to: teacherEmail,
      templateName: 'Teacher Account Setup',
      variables: {
        name: teacher.user?.email?.split('@')[0] || teacherId,
        email: teacherEmail,
        teacherId: teacher.teacherId,
        collegeName: teacher.college?.name || '',
        setupUrl,
        loginUrl: `${frontendUrl}/login`,
      },
    });

    if (emailResult.success) {
      logger.info(`[TEACHER-SETUP] Setup email sent to ${teacherEmail} | messageId=${emailResult.messageId}`);
    } else {
      logger.warn(`[TEACHER-SETUP] Setup email failed for ${teacherEmail}: ${emailResult.error}`);
    }

    // Mask email for display: j***@gmail.com
    const [localPart, domain] = teacherEmail.split('@');
    const maskedEmail = `${localPart.charAt(0)}***@${domain}`;

    res.json({
      success: true,
      message: `Setup link sent to ${maskedEmail}. Please check your inbox.`,
      data: {
        maskedEmail,
        emailSent: emailResult.success,
      },
    });
  } catch (error) {
    logger.warn({ errorName: error.name, errorCode: error.code }, 'teacherSendSetup failed');
    res.status(error.statusCode || 400).json({
      success: false,
      error: { message: error.message || 'Failed to send setup link.' }
    });
  }
};

/**
 * GET /auth/teacher-register/verify?token=
 * Validates a teacher Registration Link token (type: teacher-registration).
 * Returns teacher info (teacherId, collegeName, collegeSlug) for the form pre-fill.
 * Does NOT reveal any admin-provided email — teacher enters their own.
 */
export const verifyTeacherRegistration = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ success: false, error: { message: 'Token is required' } });

    const claims = verifyTeacherRegistrationToken(token);

    // Find the teacher record (must be in pending_setup state with no password yet)
    const teacher = await prisma.teacher.findFirst({
      where: {
        id: claims.teacherRecordId,
        teacherId: claims.teacherId,
        userId: claims.userId,
        collegeId: claims.collegeId,
        deletedAt: null,
      },
      include: {
        user: { select: { accountStatus: true, passwordHash: true } },
        college: { select: { id: true, name: true, slug: true } },
        department: { select: { name: true } },
      },
    });

    if (!teacher || !teacher.user) {
      return res.status(400).json({ success: false, error: { message: 'Invalid or expired registration link.' } });
    }

    // The link is valid only while the account has not been fully activated yet.
    // A teacher who completed registration but hasn't set up yet will have pending_setup.
    // A teacher who has already registered (but not set up password) will have pending_setup.
    // A teacher who has completed everything will have active.
    if (teacher.user.accountStatus === 'active') {
      return res.status(409).json({
        success: false,
        error: { code: 'ALREADY_REGISTERED', message: 'This teacher account has already been registered. Please log in or check your email for the setup link.' }
      });
    }

    // Return only teacher's institutional info — NO email shown (teacher enters their own)
    res.json({
      success: true,
      data: {
        teacherId: teacher.teacherId,
        collegeName: teacher.college?.name,
        collegeSlug: teacher.college?.slug,
        department: teacher.department?.name,
      }
    });
  } catch {
    res.status(400).json({ success: false, error: { message: 'Invalid or expired registration link.' } });
  }
};

/**
 * POST /auth/teacher-register
 * Step 1 of the new teacher flow.
 * Teacher opens Registration Link → provides their own name + email.
 * System:
 *   1. Validates the teacher-registration token
 *   2. Updates user account with teacher's real email and name
 *   3. Generates a Setup Link (staff-setup JWT)
 *   4. Emails the Setup Link to teacher.email (the email the teacher just entered)
 * The Setup Link is NEVER sent to the admin or any hardcoded email.
 */
export const teacherRegister = async (req, res) => {
  let stage = 'validate-request';
  try {
    const payload = teacherRegisterSchema.parse(req.body);
    stage = 'verify-registration-token';
    const claims = verifyTeacherRegistrationToken(payload.token);

    logger.info(
      `[TEACHER-REG] Step 1 started | teacher_record_id=${claims.teacherRecordId} ` +
      `teacherId=${claims.teacherId} college=${claims.collegeId}`
    );

    const teacherEmail = payload.email.trim().toLowerCase();
    const fullName = `${payload.firstName} ${payload.lastName || ''}`.trim();

    stage = 'update-teacher-user-email';

    let collegeName;
    let teacherRecord;

    await prisma.$transaction(async (tx) => {
      // 1. Find the teacher record
      const teacher = await tx.teacher.findFirst({
        where: {
          id: claims.teacherRecordId,
          teacherId: claims.teacherId,
          userId: claims.userId,
          collegeId: claims.collegeId,
          deletedAt: null,
        },
        include: {
          user: { select: { id: true, accountStatus: true, passwordHash: true, email: true } },
          college: { select: { id: true, name: true, slug: true } },
        },
      });

      if (!teacher || !teacher.user) {
        const err = new Error('Teacher record not found for this registration link.');
        err.statusCode = 400;
        err.code = 'TEACHER_NOT_FOUND';
        throw err;
      }

      if (teacher.user.accountStatus === 'active') {
        const err = new Error('This teacher account has already been registered. Please check your email for the setup link or log in.');
        err.statusCode = 409;
        err.code = 'ALREADY_REGISTERED';
        throw err;
      }

      collegeName = teacher.college?.name;
      teacherRecord = teacher;

      // 2. Check the teacher-provided email is not already used by another active user in this college
      const existingActiveUser = await tx.user.findFirst({
        where: {
          email: teacherEmail,
          collegeId: claims.collegeId,
          NOT: { id: claims.userId }, // allow the same user to use their own email
        },
      });
      if (existingActiveUser) {
        const err = new Error('An account with this email address already exists in this college. Please use a different email.');
        err.statusCode = 409;
        err.code = 'EMAIL_ALREADY_EXISTS';
        throw err;
      }

      // 3. Update the User record with teacher's real email and name
      await tx.user.update({
        where: { id: claims.userId },
        data: {
          email: teacherEmail,
          ...(fullName ? { name: fullName } : {}),
        },
      });

      // 4. Update teacher.emailId with the teacher's own email
      await tx.teacher.update({
        where: { id: claims.teacherRecordId },
        data: { emailId: teacherEmail },
      });
    });

    stage = 'generate-setup-token';

    // 5. Generate the Setup JWT (staff-setup token) with teacher's registered email
    const setupToken = createStaffSetupToken({
      teacherRecordId: claims.teacherRecordId,
      teacherId: claims.teacherId,
      userId: claims.userId,
      collegeId: claims.collegeId,
      email: teacherEmail,
    });

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
    const setupUrl = `${frontendUrl}/teacher/setup?token=${encodeURIComponent(setupToken)}`;

    stage = 'send-setup-email';

    logger.info(`[TEACHER-REG] Sending Setup Link to teacher.email=${teacherEmail}`);

    // Fire-and-forget: respond immediately — do NOT await email.
    // Awaiting SMTP causes the entire HTTP request to timeout (60000ms) if
    // the mail server is slow or unreachable.
    sendDynamicMail({
      to: teacherEmail,          // ALWAYS teacher's own email, never admin email
      templateName: 'Teacher Account Setup',
      variables: {
        name: fullName || teacherEmail.split('@')[0],
        email: teacherEmail,
        teacherId: claims.teacherId,
        collegeName: collegeName || '',
        setupUrl,
        loginUrl: `${frontendUrl}/login`,
      },
    }).then((emailResult) => {
      if (emailResult.success) {
        logger.info(`[TEACHER-REG] Setup email sent to ${teacherEmail} | messageId=${emailResult.messageId}`);
      } else {
        logger.warn(`[TEACHER-REG] Setup email FAILED for ${teacherEmail}: ${emailResult.error}`);
      }
    }).catch((err) => {
      logger.warn(`[TEACHER-REG] Setup email exception for ${teacherEmail}: ${err.message}`);
    });

    logger.info(
      `[TEACHER-REG] Step 1 complete | teacher_record_id=${claims.teacherRecordId} ` +
      `email=${teacherEmail}`
    );

    res.json({
      success: true,
      message: 'Registration successful! A setup link has been sent to your email. Please check your inbox to complete your account setup.',
      data: {
        email: teacherEmail,
        emailSent: true,
      }
    });
  } catch (error) {
    logger.warn({
      stage,
      errorName: error.name,
      errorCode: error.code || error.statusCode || 'UNKNOWN',
    }, 'Teacher registration step 1 failed');
    const isValidationError = error.name === 'ZodError';
    const status = error.statusCode || (isValidationError ? 400 : 400);
    res.status(status).json({
      success: false,
      error: {
        code: error.code || 'TEACHER_REGISTER_FAILED',
        message: isValidationError ? error.message : (error.message || 'Registration failed. The link may be invalid or expired.')
      }
    });
  }
};


const findTeacherForSetup = (client, claims) => client.teacher.findFirst({
  where: {
    id: claims.teacherRecordId,
    teacherId: claims.teacherId,
    userId: claims.userId,
    collegeId: claims.collegeId,
    deletedAt: null,
  },
  include: {
    user: true,
    college: { select: { id: true, name: true, slug: true } },
    department: { select: { name: true } },
  },
});

const hasPendingSetupIdentity = (teacher, claims) => {
  const email = teacher?.emailId || teacher?.user?.email;
  return Boolean(
    teacher &&
    teacher.user &&
    teacher.college &&
    teacher.id === claims.teacherRecordId &&
    teacher.teacherId === claims.teacherId &&
    teacher.userId === claims.userId &&
    teacher.collegeId === claims.collegeId &&
    teacher.user.collegeId === claims.collegeId &&
    teacher.user.email?.toLowerCase() === claims.email.toLowerCase() &&
    email === claims.email &&
    teacher.user.accountStatus === 'pending_setup' &&
    teacher.user.passwordHash === null
  );
};

const invalidSetupLink = (code = 'SETUP_LINK_INVALID') => {
  const error = new Error('This setup link is invalid, expired, or already used.');
  error.statusCode = 400;
  error.code = code;
  return error;
};

export const verifyStaffSetup = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ success: false, error: { message: 'Token is required' } });

    const claims = verifyStaffSetupToken(token);
    const teacher = await findTeacherForSetup(prisma, claims);
    if (!hasPendingSetupIdentity(teacher, claims)) throw invalidSetupLink();

    res.json({
      success: true,
      data: {
        email: teacher.emailId || teacher.user.email,
        name: teacher.user.name,
        role: teacher.user.role,
        teacherId: teacher.teacherId,
        department: teacher.department?.name,
        collegeName: teacher.college.name,
        collegeSlug: teacher.college.slug,
      }
    });
  } catch {
    res.status(400).json({ success: false, error: { message: 'Invalid or expired setup link.' } });
  }
};

export const completeStaffSetup = async (req, res) => {
  let setupStage = 'validate-request';
  try {
    const payload = staffSetupSchema.parse(req.body);
    setupStage = 'verify-token';
    const claims = verifyStaffSetupToken(payload.token);

    logger.info(
      `[TEACHER] Registration token validated | teacher_record_id=${claims.teacherRecordId} ` +
      `teacherId=${claims.teacherId} college=${claims.collegeId}`
    );

    setupStage = 'hash-password';
    const passwordHash = await bcrypt.hash(payload.password, 10);
    const fullName = `${payload.firstName} ${payload.lastName}`.trim();

    let activatedEmail;
    let collegeName;

    await prisma.$transaction(async (tx) => {
      setupStage = 'check-teacher-user-college-association';
      const teacher = await findTeacherForSetup(tx, claims);
      if (!hasPendingSetupIdentity(teacher, claims)) throw invalidSetupLink('SETUP_ASSOCIATION_INVALID');

      collegeName = teacher.college?.name;
      activatedEmail = teacher.emailId || teacher.user.email;

      setupStage = 'activate-pending-user';
      const updated = await tx.user.updateMany({
        where: {
          id: claims.userId,
          collegeId: claims.collegeId,
          email: teacher.user.email,
          accountStatus: 'pending_setup',
          passwordHash: null,
        },
        data: {
          passwordHash,
          accountStatus: 'active',
          name: fullName
        }
      });
      if (updated.count !== 1) throw invalidSetupLink('SETUP_ALREADY_COMPLETED');
    });

    logger.info(
      `[TEACHER] Teacher account created | teacher_record_id=${claims.teacherRecordId} ` +
      `teacherId=${claims.teacherId} email=${activatedEmail} college=${claims.collegeId}`
    );

    // Send welcome login-link email AFTER successful registration
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
    const loginUrl = `${frontendUrl}/login`;

    logger.info(`[EMAIL] Sending teacher welcome email to ${activatedEmail}`);

    // Fire-and-forget: respond immediately — do NOT await email.
    // Awaiting SMTP causes the entire HTTP request to timeout (60000ms) if
    // the mail server is slow or unreachable.
    sendDynamicMail({
      to: activatedEmail,
      templateName: 'Teacher Account Setup',
      variables: {
        name: fullName || activatedEmail.split('@')[0],
        email: activatedEmail,
        teacherId: claims.teacherId,
        collegeName: collegeName || '',
        setupUrl: loginUrl,   // re-uses the {{setupUrl}} placeholder as the login link
        loginUrl,
      },
    }).then((emailResult) => {
      if (emailResult.success) {
        logger.info(`[EMAIL] Teacher welcome email sent successfully to ${activatedEmail}`);
      } else {
        logger.warn(`[EMAIL] Teacher welcome email failed for ${activatedEmail}: ${emailResult.error}`);
      }
    }).catch((err) => {
      logger.warn(`[EMAIL] Teacher welcome email exception for ${activatedEmail}: ${err.message}`);
    });

    res.json({
      success: true,
      message: 'Registration completed successfully! Check your email for the login link.'
    });
  } catch (error) {
    logger.warn({
      reqId: req.id,
      stage: setupStage,
      errorName: error.name,
      errorCode: error.code || error.statusCode || 'UNKNOWN',
    }, 'Teacher account setup rejected');
    const isValidationError = error.name === 'ZodError';
    res.status(error.statusCode || 400).json({
      success: false,
      error: { message: isValidationError ? error.message : 'Invalid or expired setup link.' }
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email: rawEmail } = forgotPasswordSchema.parse(req.body);
    const normalizedEmail = rawEmail.trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive'
        }
      }
    });

    if (!user) {
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    const secret = JWT_SECRET + (user.passwordHash || '');
    const token = jwt.sign({ userId: user.id, email: user.email }, secret, { expiresIn: '15m' });

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
    const resetLink = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}&id=${encodeURIComponent(user.id)}`;
    
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

    const secret = JWT_SECRET + (user.passwordHash || '');
    
    try {
      jwt.verify(token, secret);
    } catch (err) {
      return res.status(400).json({ success: false, error: { message: 'Invalid or expired token' } });
    }

    const newPasswordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        accountStatus: user.accountStatus === 'pending_setup' ? 'active' : user.accountStatus
      }
    });

    res.json({ success: true, message: 'Password has been successfully reset.' });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};
