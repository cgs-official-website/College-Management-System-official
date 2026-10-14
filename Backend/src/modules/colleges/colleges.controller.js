import { prisma } from '../../server.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { onboardCollegeSchema, updateCollegeStatusSchema, updateCollegeSchema, updateSubscriptionSchema } from './colleges.schema.js';
import { sendDynamicMail } from '../../services/email/email.service.js';

export const getCollegeBySlug = async (req, res) => {
  try {
    const college = await prisma.college.findUnique({
      where: { slug: req.params.slug },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        contactEmail: true,
        website: true
      }
    });

    if (!college) {
      return res.status(404).json({ success: false, error: { message: 'College not found' } });
    }

    return res.json({ success: true, data: college });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const getCollegeRegistrationContext = async (req, res) => {
  try {
    const { identifier } = req.params;
    const isCollegeId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
    const college = await prisma.college.findUnique({
      where: isCollegeId ? { id: identifier } : { slug: identifier },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        contactEmail: true,
        website: true,
        status: true
      }
    });

    if (!college) {
      return res.status(404).json({ success: false, error: { message: 'College not found' } });
    }
    if (college.status === 'rejected') {
      return res.status(403).json({ success: false, error: { message: 'College registration was rejected' } });
    }

    const { status, ...registrationContext } = college;
    return res.json({ success: true, data: registrationContext });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};

// Public: return courses for a college (used by student registration form, no auth needed)
export const getCollegePublicCourses = async (req, res) => {
  try {
    const { identifier } = req.params;
    const isCollegeId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier);
    const college = await prisma.college.findUnique({
      where: isCollegeId ? { id: identifier } : { slug: identifier },
      select: { id: true, status: true }
    });

    if (!college || college.status === 'rejected') {
      return res.status(404).json({ success: false, error: { message: 'College not found' } });
    }

    const courses = await prisma.course.findMany({
      where: { collegeId: college.id },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' }
    });

    return res.json({ success: true, data: courses });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: error.message } });
  }
};


export const getAllColleges = async (req, res) => {
  try {
    const colleges = await prisma.college.findMany({
      include: {
        billingSubscription: true,
        users: {
          where: { role: 'admin' },
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Map billingSubscription fields to college object for frontend compatibility
    const mappedColleges = colleges.map(college => ({
      ...college,
      email: college.contactEmail || college.users?.[0]?.email || null,
      phone: college.contactPhone || null,
      subscriptionPlan: college.billingSubscription?.planTier || null,
      subscriptionStatus: college.billingSubscription?.status || null,
      subscriptionEndDate: college.billingSubscription?.currentPeriodEnd || college.billingSubscription?.trialExpiresAt || null
    }));

    res.json({ data: mappedColleges });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

import { getNextCollegeCode } from '../../lib/collegeCodeGenerator.js';

export const onboardCollege = async (req, res) => {
  try {
    const { adminUser, collegeData } = onboardCollegeSchema.parse(req.body);
    
    // Check if admin email already exists
    const existingUser = await prisma.user.findFirst({
      where: { email: adminUser.email }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: { message: 'The admin email address is already in use by another account.' } });
    }

    // Generate a unique slug/shortName
    let baseSlug = (collegeData.shortName || collegeData.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    if (!baseSlug) baseSlug = 'college';
    
    let finalSlug = baseSlug;
    const existingSlug = await prisma.college.findUnique({
      where: { slug: finalSlug }
    });

    if (existingSlug) {
      finalSlug = `${baseSlug}-${crypto.randomBytes(3).toString('hex')}`;
    }
    
    // Create address string
    const addressParts = [collegeData.streetAddress, collegeData.city, collegeData.district, collegeData.state, collegeData.country, collegeData.pincode].filter(Boolean);
    const fullAddress = addressParts.join(', ');

    // Perform transaction to create college, default subscription, and admin user
    const result = await prisma.$transaction(async (tx) => {
      // Generate next sequential College Code (e.g. ZUNAC002, ZUNAC003, ...)
      const registrationNo = await getNextCollegeCode(tx);

      const college = await tx.college.create({
        data: {
          name: collegeData.name,
          slug: finalSlug,
          registrationNo,
          status: 'pending',
          address: fullAddress || null,
          contactEmail: collegeData.email || null,
          contactPhone: collegeData.phone || null,
          website: collegeData.websiteUrl || null,
          affiliationCode: collegeData.affiliationCode || null,
          aicteNumber: collegeData.aicteNumber || null,
          ugcCode: collegeData.ugcRecognition || null,
          logoUrl: collegeData.logoBase64 || null
        }
      });

      const passwordHash = await bcrypt.hash(adminUser.password, 10);
      
      const admin = await tx.user.create({
        data: {
          collegeId: college.id,
          email: adminUser.email,
          name: adminUser.name,
          passwordHash,
          role: 'admin',
          accountStatus: 'active'
        }
      });

      await tx.billingSubscription.create({
        data: {
          collegeId: college.id,
          planTier: 'Enterprise',
          pricePerStudent: 0,
          maxStudents: 5000,
          storageLimitGb: 50,
          status: 'Active',
          trialExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });

      return { collegeCode: registrationNo, registrationNo, collegeId: college.id, adminEmail: admin.email, collegeName: college.name };
    }, { maxWait: 15000, timeout: 30000 });

    res.status(201).json({ data: result });
  } catch (error) {
    if (error.name === 'ZodError' || error.issues || error.errors) {
      const issues = error.issues || error.errors;
      const message = Array.isArray(issues) ? issues.map(e => e.message).join('; ') : error.message;
      return res.status(400).json({ error: { message } });
    }
    res.status(400).json({ error: { message: error.message || 'Failed to onboard college' } });
  }
};

import { invalidateCollegeStatusCache } from '../../middleware/requireApprovedCollege.js';

export const getMyCollegeStatus = async (req, res) => {
  try {
    const collegeId = req.user?.collegeId;
    if (!collegeId) {
      return res.status(400).json({ success: false, error: { code: 'NO_COLLEGE_ID', message: 'No college associated with this user' } });
    }

    const college = await prisma.college.findUnique({
      where: { id: collegeId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        registrationNo: true
      }
    });

    if (!college) {
      return res.status(404).json({ success: false, error: { code: 'COLLEGE_NOT_FOUND', message: 'College not found' } });
    }

    res.json({
      success: true,
      data: {
        collegeId: college.id,
        collegeName: college.name,
        slug: college.slug,
        status: college.status,
        registrationNo: college.registrationNo,
        collegeCode: college.registrationNo
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const updateCollegeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = updateCollegeStatusSchema.parse(req.body);
    
    // Find existing college and its admin users
    const existingCollege = await prisma.college.findUnique({
      where: { id },
      include: {
        users: {
          where: { role: 'admin' },
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!existingCollege) {
      return res.status(404).json({ success: false, error: { message: 'College not found' } });
    }

    const previousStatus = existingCollege.status;

    const college = await prisma.college.update({
      where: { id },
      data: { status }
    });
    
    // Invalidate Redis cache for live status
    await invalidateCollegeStatusCache(id);

    // If status is updated to active from a non-active state (or explicitly activated), send activation notification email
    if (status === 'active' && previousStatus !== 'active') {
      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
      const loginUrl = `${frontendUrl}/login`;
      const collegeCode = college.registrationNo || college.slug || 'N/A';

      // Gather recipient targets: admin users + official contact email
      const targets = [];
      const seenEmails = new Set();

      for (const admin of (existingCollege.users || [])) {
        if (admin.email && !seenEmails.has(admin.email.trim().toLowerCase())) {
          seenEmails.add(admin.email.trim().toLowerCase());
          targets.push({
            email: admin.email.trim(),
            name: admin.name || 'College Administrator'
          });
        }
      }

      if (existingCollege.contactEmail && !seenEmails.has(existingCollege.contactEmail.trim().toLowerCase())) {
        seenEmails.add(existingCollege.contactEmail.trim().toLowerCase());
        targets.push({
          email: existingCollege.contactEmail.trim(),
          name: `${college.name} Administration`
        });
      }

      // Asynchronously send emails (fire-and-forget so HTTP response remains snappy)
      if (targets.length > 0) {
        Promise.allSettled(
          targets.map(target =>
            sendDynamicMail({
              to: target.email,
              templateName: 'College Activated',
              headerTitle: college.name || 'College Management System',
              fromName: 'Super Admin - Campus Portal',
              variables: {
                name: target.name,
                email: target.email,
                collegeName: college.name,
                collegeCode: collegeCode,
                loginUrl,
                frontendUrl
              }
            })
          )
        ).then(results => {
          results.forEach((r, idx) => {
            const target = targets[idx];
            if (r.status === 'fulfilled' && r.value?.success) {
              console.log(`[CollegeActivation] ✅ Activation email sent to ${target.email} for college "${college.name}"`);
            } else {
              console.error(`[CollegeActivation] ❌ Failed sending activation email to ${target?.email}:`, r.reason || r.value?.error);
            }
          });
        }).catch(err => {
          console.error('[CollegeActivation] Error in activation email process:', err);
        });
      }
    }

    // If status is updated to suspended, send professional suspension notification email
    if (status === 'suspended' && previousStatus !== 'suspended') {
      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
      const collegeCode = college.registrationNo || college.slug || 'N/A';
      const effectiveDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const suspensionReason = reason || 'Administrative review & platform compliance verification';
      const supportEmail = process.env.SUPPORT_EMAIL || process.env.SMTP_USER || 'support@teamzuna.in';
      const supportPhone = process.env.SUPPORT_PHONE || '+1 (800) 555-0199';

      // Gather recipient targets: admin users + official contact email
      const targets = [];
      const seenEmails = new Set();

      for (const admin of (existingCollege.users || [])) {
        if (admin.email && !seenEmails.has(admin.email.trim().toLowerCase())) {
          seenEmails.add(admin.email.trim().toLowerCase());
          targets.push({
            email: admin.email.trim(),
            name: admin.name || 'College Administrator'
          });
        }
      }

      if (existingCollege.contactEmail && !seenEmails.has(existingCollege.contactEmail.trim().toLowerCase())) {
        seenEmails.add(existingCollege.contactEmail.trim().toLowerCase());
        targets.push({
          email: existingCollege.contactEmail.trim(),
          name: `${college.name} Administration`
        });
      }

      // Asynchronously send emails (fire-and-forget so HTTP response remains snappy)
      if (targets.length > 0) {
        Promise.allSettled(
          targets.map(target =>
            sendDynamicMail({
              to: target.email,
              templateName: 'College Suspended',
              headerTitle: college.name || 'College Management System',
              fromName: 'Super Admin - Campus Portal',
              variables: {
                name: target.name,
                email: target.email,
                collegeName: college.name,
                collegeCode: collegeCode,
                effectiveDate,
                suspensionReason,
                supportEmail,
                supportPhone,
                portalUrl: frontendUrl
              }
            })
          )
        ).then(results => {
          results.forEach((r, idx) => {
            const target = targets[idx];
            if (r.status === 'fulfilled' && r.value?.success) {
              console.log(`[CollegeSuspension] ✅ Suspension email sent to ${target.email} for college "${college.name}"`);
            } else {
              console.error(`[CollegeSuspension] ❌ Failed sending suspension email to ${target?.email}:`, r.reason || r.value?.error);
            }
          });
        }).catch(err => {
          console.error('[CollegeSuspension] Error in suspension email process:', err);
        });
      }
    }

    res.json({ success: true, data: college });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const deleteCollege = async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.college.delete({
      where: { id }
    });
    
    res.json({ data: { success: true } });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};

export const getCollege = async (req, res) => {
  try {
    const { id } = req.params;

    // Security check: Only allow superadmin or college admin managing their college
    if (req.user?.role !== 'superadmin' && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Requires admin or superadmin role' }
      });
    }

    if (req.user?.role !== 'superadmin' && req.user?.collegeId !== id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Unauthorized college access' }
      });
    }

    const college = await prisma.college.findUnique({
      where: { id }
    });
    if (!college) return res.status(404).json({ success: false, error: { message: 'College not found' } });
    res.json({ success: true, data: college });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const updateCollege = async (req, res) => {
  try {
    const { id } = req.params;

    // Security check: Only allow superadmin or college admin managing their college
    if (req.user?.role !== 'superadmin' && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Requires admin or superadmin role' }
      });
    }

    if (req.user?.role !== 'superadmin' && req.user?.collegeId !== id) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Unauthorized college access' }
      });
    }

    const validatedData = updateCollegeSchema.parse(req.body);

    const college = await prisma.college.update({
      where: { id },
      data: validatedData
    });

    res.json({ success: true, data: college });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

export const updateCollegeSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { planTier, status, currentPeriodEnd } = updateSubscriptionSchema.parse(req.body);

    const college = await prisma.college.findUnique({
      where: { id }
    });

    if (!college) {
      return res.status(404).json({ error: { message: 'College not found' } });
    }

    const subscription = await prisma.billingSubscription.upsert({
      where: { collegeId: id },
      update: {
        planTier,
        status: status || 'Active',
        currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : null,
        updatedAt: new Date()
      },
      create: {
        collegeId: id,
        planTier,
        pricePerStudent: 0,
        maxStudents: 5000,
        storageLimitGb: 50,
        status: status || 'Active',
        currentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd) : null
      }
    });

    res.json({ data: subscription });
  } catch (error) {
    if (error.name === 'ZodError' || error.issues || error.errors) {
      const issues = error.issues || error.errors;
      const message = Array.isArray(issues) ? issues.map(e => e.message).join('; ') : error.message;
      return res.status(400).json({ error: { message } });
    }
    res.status(400).json({ error: { message: error.message } });
  }
};
