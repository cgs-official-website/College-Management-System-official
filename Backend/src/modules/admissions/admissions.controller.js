import { prisma, logger } from '../../server.js';
import { z } from 'zod';

const submitSchema = z.object({
  applicantName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')).nullable(),
  phone: z.string().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  courseId: z.string().uuid().optional().nullable(),
  courseName: z.string().optional().nullable(),
  previousSchool: z.string().optional().nullable(),
  marksheetDetails: z.record(z.string(), z.any()).optional().default({}),
  createdFromLeadId: z.string().uuid().optional().nullable(),
  status: z.string().optional().default('Pending'),
  residenceType: z.string().optional().default('Day Scholar')
});

const updateSchema = z.object({
  status: z.string().optional(),
  applicantName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')).nullable(),
  phone: z.string().optional().nullable(),
  courseId: z.string().uuid().optional().nullable(),
  courseName: z.string().optional().nullable(),
  previousSchool: z.string().optional().nullable(),
  residenceType: z.string().optional().nullable(),
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
    email: payload.email || '',
    phone: payload.phone || '',
    previousSchool: payload.previousSchool || '',
    courseName: payload.courseName || '',
    courseId: payload.courseId || null,
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

  const currentDetails = typeof admission.marksheetDetails === 'object' && admission.marksheetDetails !== null ? admission.marksheetDetails : {};
  const updatedMarksheetDetails = {
    ...currentDetails,
    ...(payload.marksheetDetails || {}),
    ...(payload.email !== undefined ? { email: payload.email || '' } : {}),
    ...(payload.phone !== undefined ? { phone: payload.phone || '' } : {}),
    ...(payload.courseId !== undefined ? { courseId: payload.courseId || null } : {}),
    ...(payload.courseName !== undefined ? { courseName: payload.courseName || '' } : {}),
    ...(payload.previousSchool !== undefined ? { previousSchool: payload.previousSchool || '' } : {}),
  };

  const computedApplicantName = payload.applicantName 
    || (payload.firstName || payload.lastName ? `${payload.firstName || ''} ${payload.lastName || ''}`.trim() : undefined);

  const updated = await prisma.admission.update({
    where: { id },
    data: {
      ...(payload.status ? { status: payload.status } : {}),
      ...(computedApplicantName ? { applicantName: computedApplicantName } : {}),
      ...(payload.residenceType ? { residenceType: payload.residenceType } : {}),
      marksheetDetails: updatedMarksheetDetails,
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
