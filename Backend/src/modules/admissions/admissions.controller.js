import { prisma, logger } from '../../server.js';
import { z } from 'zod';

const submitSchema = z.object({
  applicantName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
    z.string().trim().email('Invalid email address').nullish()
  ).transform(val => (val ? val.toLowerCase() : null)),
  phone: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
    z.string().trim().nullish()
  ),
  departmentId: z.string().uuid().optional(),
  courseId: z.string().uuid().optional(),
  courseName: z.string().optional(),
  previousSchool: z.string().optional(),
  marksheetDetails: z.record(z.string(), z.any()).optional().default({}),
  createdFromLeadId: z.string().uuid().optional(),
  status: z.string().optional().default('Pending'),
  residenceType: z.string().optional().default('Day Scholar')
});

const updateSchema = z.object({
  status: z.string().optional(),
  applicantName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
    z.string().trim().nullish()
  ),
  email: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
    z.string().trim().email('Invalid email address').nullable().optional()
  ).transform(val => (val ? val.toLowerCase() : val)),
  departmentId: z.string().uuid().optional(),
  courseId: z.string().uuid().optional(),
  courseName: z.string().optional(),
  previousSchool: z.string().optional().nullable(),
  residenceType: z.string().optional(),
  marksheetDetails: z.record(z.string(), z.any()).optional(),
});

export const getAdmissions = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;

  const admissions = await prisma.admission.findMany({
    where: { collegeId },
    include: {
      department: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  const formatted = admissions.map(a => {
    const nameParts = (a.applicantName || 'Applicant').split(' ');
    const firstName = nameParts[0] || 'Applicant';
    const lastName = nameParts.slice(1).join(' ') || '';
    const details = typeof a.marksheetDetails === 'object' && a.marksheetDetails !== null ? a.marksheetDetails : {};

    return {
      id: a.id,
      applicantName: a.applicantName,
      firstName,
      lastName,
      email: details.email || '',
      phone: details.phone || '',
      courseId: details.courseId || a.departmentId,
      courseName: details.courseName || a.department?.name || 'General',
      previousSchool: details.previousSchool || '',
      status: a.status.charAt(0).toUpperCase() + a.status.slice(1),
      seatHoldExpiresAt: a.seatHoldExpiresAt,
      cutoffCheckResult: a.cutoffCheckResult,
      residenceType: a.residenceType,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    };
  });

  res.json({ success: true, data: formatted });
};

export const submitApplication = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const payload = submitSchema.parse(req.body);

  const fullName = payload.applicantName || `${payload.firstName || ''} ${payload.lastName || ''}`.trim() || 'New Applicant';

  // Find or create department
  let deptId = payload.departmentId;
  if (!deptId && payload.courseId) {
    const course = await prisma.course.findUnique({
      where: { id: payload.courseId }
    });
    if (course) {
      deptId = course.departmentId;
    }
  }

  if (!deptId) {
    let dept = await prisma.department.findFirst({ where: { collegeId } });
    if (!dept) {
      dept = await prisma.department.create({
        data: {
          name: payload.courseName || 'Academics',
          code: 'ACAD',
          collegeId
        }
      });
    }
    deptId = dept.id;
  }

  const marksheetDetails = {
    ...payload.marksheetDetails,
    email: payload.email,
    phone: payload.phone,
    previousSchool: payload.previousSchool,
    courseName: payload.courseName,
    courseId: payload.courseId,
  };

  const admission = await prisma.admission.create({
    data: {
      collegeId,
      applicantName: fullName,
      departmentId: deptId,
      marksheetDetails,
      createdFromLeadId: payload.createdFromLeadId,
      status: payload.status || 'Pending',
      residenceType: payload.residenceType || 'Day Scholar',
      cutoffCheckResult: { passed: true }
    },
    include: {
      department: true
    }
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} admissionId=${admission.id} actor=${actorId} Submitted admission inquiry`);
  res.status(201).json({ success: true, data: admission });
};

export const updateAdmission = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { id } = req.params;
  const payload = updateSchema.parse(req.body);

  const admission = await prisma.admission.findFirst({
    where: { id, collegeId }
  });

  if (!admission) {
    return res.status(404).json({ success: false, error: { code: 'ADMISSION_NOT_FOUND', message: 'Application not found' } });
  }

  // Safe runtime shape verification for marksheetDetails
  const isObject = typeof admission.marksheetDetails === 'object' && admission.marksheetDetails !== null && !Array.isArray(admission.marksheetDetails);
  const existingDetails = isObject ? { ...admission.marksheetDetails } : {};

  let hasDetailsChange = false;
  const mergedDetails = { ...existingDetails };

  if (payload.marksheetDetails) {
    Object.assign(mergedDetails, payload.marksheetDetails);
    hasDetailsChange = true;
  }

  if (payload.phone !== undefined) {
    mergedDetails.phone = payload.phone; // null if empty/whitespace, string if provided
    hasDetailsChange = true;
  }

  if (payload.email !== undefined) {
    mergedDetails.email = payload.email; // null if empty/cleared, string if provided
    hasDetailsChange = true;
  }

  if (payload.previousSchool !== undefined) {
    mergedDetails.previousSchool = payload.previousSchool;
    hasDetailsChange = true;
  }

  if (payload.courseName !== undefined) {
    mergedDetails.courseName = payload.courseName;
    hasDetailsChange = true;
  }

  if (payload.courseId !== undefined) {
    mergedDetails.courseId = payload.courseId;
    hasDetailsChange = true;
  }

  const fullName = payload.applicantName || (payload.firstName || payload.lastName ? `${payload.firstName || ''} ${payload.lastName || ''}`.trim() : undefined);

  const updated = await prisma.admission.update({
    where: { id },
    data: {
      ...(payload.status ? { status: payload.status } : {}),
      ...(fullName ? { applicantName: fullName } : {}),
      ...(payload.residenceType ? { residenceType: payload.residenceType } : {}),
      ...(hasDetailsChange ? { marksheetDetails: mergedDetails } : {})
    }
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} admissionId=${id} actor=${actorId} Updated admission`);
  res.json({ success: true, data: updated });
};

export const deleteAdmission = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { id } = req.params;

  const admission = await prisma.admission.findFirst({
    where: { id, collegeId }
  });

  if (!admission) {
    return res.status(404).json({ success: false, error: { code: 'ADMISSION_NOT_FOUND', message: 'Application not found' } });
  }

  await prisma.admission.delete({ where: { id } });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} admissionId=${id} actor=${actorId} Deleted admission`);
  res.json({ success: true, message: 'Admission application deleted successfully' });
};

export const allotSeat = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const { admissionId } = req.body;

  if (!admissionId) {
    return res.status(400).json({ success: false, error: { code: 'ADMISSION_ID_REQUIRED', message: 'Admission ID is required' } });
  }

  const admission = await prisma.admission.findFirst({
    where: { id: admissionId, collegeId }
  });

  if (!admission) {
    return res.status(404).json({ success: false, error: { code: 'ADMISSION_NOT_FOUND', message: 'Application not found' } });
  }

  const seatHoldExpiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  const updated = await prisma.admission.update({
    where: { id: admission.id },
    data: {
      status: 'Approved',
      seatHoldExpiresAt
    }
  });

  res.json({ success: true, data: updated });
};
