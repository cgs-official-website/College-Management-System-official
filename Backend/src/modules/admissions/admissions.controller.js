import { prisma, logger } from '../../server.js';
import { z } from 'zod';

const submitSchema = z.object({
  applicantName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  courseId: z.string().uuid().optional(),
  courseName: z.string().optional(),
  previousSchool: z.string().optional(),
  marksheetDetails: z.record(z.string(), z.any()).optional().default({}),
  createdFromLeadId: z.string().uuid().optional(),
  status: z.string().optional().default('Pending')
});

const updateSchema = z.object({
  status: z.string().optional(),
  applicantName: z.string().optional(),
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
      courseId: a.departmentId,
      courseName: a.department?.name || details.courseName || 'General',
      previousSchool: details.previousSchool || '',
      status: a.status.charAt(0).toUpperCase() + a.status.slice(1),
      seatHoldExpiresAt: a.seatHoldExpiresAt,
      cutoffCheckResult: a.cutoffCheckResult,
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
  let deptId = payload.departmentId || payload.courseId;
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
  };

  const admission = await prisma.admission.create({
    data: {
      collegeId,
      applicantName: fullName,
      departmentId: deptId,
      marksheetDetails,
      createdFromLeadId: payload.createdFromLeadId,
      status: payload.status || 'Pending',
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

  const updated = await prisma.admission.update({
    where: { id },
    data: {
      ...(payload.status ? { status: payload.status } : {}),
      ...(payload.applicantName ? { applicantName: payload.applicantName } : {}),
      ...(payload.marksheetDetails ? { marksheetDetails: payload.marksheetDetails } : {}),
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
