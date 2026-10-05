import { randomUUID } from 'crypto';
import { prisma } from '../../lib/prisma.js';
import { uploadBuffer, getSignedAssetUrl, deleteAsset } from '../../lib/cloudinary.js';
import { logger } from '../../server.js';

const fail = (res, status, code, message) =>
  res.status(status).json({ success: false, error: { code, message } });

const NON_STAFF_ROLES = ['student', 'parent', 'superadmin'];
const REVIEWER_BLOCKED_ROLES = ['student', 'parent', 'superadmin'];
const isAdminUser = (req) => req.user?.role === 'admin';
const canReview = (req) => isAdminUser(req) || !REVIEWER_BLOCKED_ROLES.includes(req.user?.role);

const TAG_RE = /^\[([^\]]+)\]\s*/;
const splitReason = (raw = '') => {
  const m = raw.match(TAG_RE);
  return m
    ? { leaveType: m[1], reason: raw.replace(TAG_RE, '') }
    : { leaveType: null, reason: raw };
};

export const ALLOWED_PROOF_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];
export const MAX_PROOF_SIZE_BYTES = 5 * 1024 * 1024; 

const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
};

export const buildProofPayload = async ({ proofFileName, proofMimeType, proofDataUrl, collegeId }) => {
  if (!proofDataUrl) return { proof: null, error: null };

  const match = /^data:([^;]+);base64,(.+)$/.exec(proofDataUrl);
  if (!match) return { proof: null, error: 'Invalid proof file data.' };

  const [, mimeFromData, base64] = match;
  const mimeType = proofMimeType || mimeFromData;

  if (!ALLOWED_PROOF_TYPES.includes(mimeType)) {
    return { proof: null, error: 'Proof must be an image, PDF, or Word document.' };
  }

  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length) return { proof: null, error: 'Proof file is empty.' };
  if (buffer.length > MAX_PROOF_SIZE_BYTES) {
    return { proof: null, error: 'Proof file must be under 5 MB.' };
  }

  const isImage = mimeType.startsWith('image/');
  const resourceType = isImage ? 'image' : 'raw';
  const id = randomUUID();
  const publicId = isImage ? id : `${id}.${EXT_BY_MIME[mimeType]}`; 

  let result;
  try {
    result = await uploadBuffer(buffer, {
      folder: `leave-proofs/${collegeId}`,
      public_id: publicId,
      resource_type: resourceType,
      type: 'authenticated'
    });
  } catch (err) {
    return { proof: null, error: 'Failed to upload proof file. Please try again.' };
  }

  const proof = JSON.stringify({
    provider: 'cloudinary',
    fileName: String(proofFileName || 'proof').slice(0, 200),
    mimeType,
    publicId: result.public_id,
    resourceType: result.resource_type,
    format: isImage ? result.format : null,
    bytes: result.bytes
  });

  return { proof, error: null };
};

export const parseProofMeta = (raw) => {
  if (!raw) return { hasProof: false, proofFileName: null, proofMimeType: null };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.publicId || parsed.data)) {
      return {
        hasProof: true,
        proofFileName: parsed.fileName || 'proof',
        proofMimeType: parsed.mimeType || 'application/octet-stream'
      };
    }
  } catch {}
  return { hasProof: false, proofFileName: null, proofMimeType: null };
};

export const toSafeLeave = (leave) => {
  const { medicalCertUrl, ...rest } = leave;
  return { ...rest, ...parseProofMeta(medicalCertUrl) };
};

export const discardProof = async (proof) => {
  if (!proof) return;
  try {
    const { publicId, resourceType } = JSON.parse(proof);
    if (publicId) await deleteAsset(publicId, resourceType);
  } catch {
  }
};

const resolveMyRole = async (userId, collegeId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      role: true,
      customRoleId: true,
      customRole: { select: { id: true, name: true } }
    }
  });
  if (!user) return null;

  if (user.customRoleId && user.customRole) {
    return { user, roleId: user.customRole.id, roleName: user.customRole.name };
  }

  const byName = user.role
    ? await prisma.role.findFirst({
        where: { collegeId, name: { equals: user.role, mode: 'insensitive' } },
        select: { id: true, name: true }
      })
    : null;

  return { user, roleId: byName?.id ?? null, roleName: byName?.name ?? user.role };
};

export const getLeaveRequests = async (req, res) => {
  try {
    if (!canReview(req)) {
      return fail(res, 403, 'FORBIDDEN', 'You are not allowed to view leave requests.');
    }
    const admin = isAdminUser(req);
    const collegeId = req.tenant?.collegeId || req.user?.collegeId;
    const { status, applicantType } = req.query;

    const where = { collegeId };
    if (status && status !== 'all') where.status = status;

    const leaves = await prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    const userIds = [...new Set(leaves.map((l) => l.requesterUserId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        customRole: { select: { name: true } },
        studentProfile: {
          select: {
            admissionNumber: true,
            rollNumber: true,
            department: { select: { name: true } },
            section: { select: { name: true } }
          }
        },
        teacherProfile: {
          select: {
            designation: true,
            department: { select: { name: true } }
          }
        }
      }
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    let data = leaves.map((l) => {
      const u = userMap.get(l.requesterUserId);
      const isStudent = !!u?.studentProfile || l.requesterRole === 'student';
      const name = u?.name || (isStudent ? 'Student' : 'Employee');
      const { leaveType, reason } = splitReason(l.reason);
      const proofMeta = parseProofMeta(l.medicalCertUrl);

      return {
        id: l.id,
        applicantType: isStudent ? 'student' : 'employee',
        requesterUserId: l.requesterUserId,
        requesterRole: l.requesterRole,
        leaveType,
        fromDate: l.fromDate,
        toDate: l.toDate,
        reason,
        status: l.status,
        reviewedBy: l.reviewedBy,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,

        ...proofMeta, 

        applicantName: name,
        applicantEmail: u?.email || '',
        studentName: name,
        studentEmail: u?.email || '',

        admissionNumber: u?.studentProfile?.admissionNumber || '',
        rollNumber: u?.studentProfile?.rollNumber || '',
        section: u?.studentProfile?.section?.name || '',

        roleName: isStudent ? '' : (l.requesterRole || u?.customRole?.name || u?.role || ''),
        designation: u?.teacherProfile?.designation || '',

        department:
          u?.studentProfile?.department?.name ||
          u?.teacherProfile?.department?.name ||
          ''
      };
    });

    if (!admin) {
      data = data.filter((d) => d.applicantType === 'student');
    } else if (applicantType === 'student') {
      data = data.filter((d) => d.applicantType === 'student');
    } else if (applicantType === 'employee') {
      data = data.filter((d) => d.applicantType === 'employee');
    }

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const updateLeaveRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const collegeId = req.tenant?.collegeId || req.user?.collegeId;
    const reviewerUserId = req.user?.id || req.user?.userId;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return fail(res, 400, 'INVALID_STATUS', 'Invalid status. Allowed values: approved, rejected, pending');
    }

    if (!canReview(req)) {
      return fail(res, 403, 'FORBIDDEN', 'You are not allowed to review leave requests.');
    }

    const existing = await prisma.leaveRequest.findFirst({ where: { id, collegeId } });
    if (!existing) return fail(res, 404, 'NOT_FOUND', 'Leave request not found');

    if (!isAdminUser(req)) {
      const requester = await prisma.user.findUnique({
        where: { id: existing.requesterUserId },
        select: { studentProfile: { select: { id: true } } }
      });
      const isStudentLeave = !!requester?.studentProfile || existing.requesterRole === 'student';
      if (!isStudentLeave) {
        return fail(res, 403, 'FORBIDDEN', 'Staff can only review student leave requests.');
      }
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: { status, reviewedBy: reviewerUserId }
    });

    res.json({ success: true, data: toSafeLeave(updated) });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const getLeaveProof = async (req, res) => {
  try {
    const { id } = req.params;
    const collegeId = req.tenant?.collegeId || req.user?.collegeId;
    const userId = req.user?.id || req.user?.userId;

    const leave = await prisma.leaveRequest.findFirst({ where: { id, collegeId } });
    if (!leave) return fail(res, 404, 'NOT_FOUND', 'Leave request not found');

    let parsed = null;
    try {
      parsed = leave.medicalCertUrl ? JSON.parse(leave.medicalCertUrl) : null;
    } catch {
      parsed = null;
    }
    if (!parsed || !(parsed.publicId || parsed.data)) {
      return fail(res, 404, 'NOT_FOUND', 'No proof file attached to this leave request.');
    }

    const isOwner = leave.requesterUserId === userId;
    const admin = isAdminUser(req);
    let allowed = isOwner || admin;

    if (!allowed && canReview(req)) {
      const requester = await prisma.user.findUnique({
        where: { id: leave.requesterUserId },
        select: { studentProfile: { select: { id: true } } }
      });
      const isStudentLeave = !!requester?.studentProfile || leave.requesterRole === 'student';
      allowed = isStudentLeave;
    }

    if (!allowed) return fail(res, 403, 'FORBIDDEN', 'You are not allowed to view this file.');

    let buffer;
    if (parsed.publicId) {
      const url = getSignedAssetUrl({
        publicId: parsed.publicId,
        resourceType: parsed.resourceType || 'image',
        format: parsed.format
      });
      const upstream = await fetch(url);
      if (!upstream.ok) {
        logger.error(
          {
            leaveId: id,
            status: upstream.status,
            cldError: upstream.headers.get('x-cld-error'),
            publicId: parsed.publicId
          },
          'Cloudinary proof fetch failed'
        );
        return fail(res, 502, 'UPSTREAM_ERROR', 'Could not retrieve proof file.');
      }
      buffer = Buffer.from(await upstream.arrayBuffer());
    } else {
      buffer = Buffer.from(parsed.data, 'base64');
    }

    const safeName = String(parsed.fileName || 'proof').replace(/[\r\n"]/g, '');
    res.setHeader('Content-Type', parsed.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.end(buffer);
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const getLeaveRoles = async (req, res) => {
  try {
    const collegeId = req.tenant?.collegeId || req.user?.collegeId;
    const userId = req.user?.id || req.user?.userId;

    const roles = await prisma.role.findMany({
      where: { collegeId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });

    const mine = await resolveMyRole(userId, collegeId);

    res.json({
      success: true,
      data: { roles, myRoleId: mine?.roleId ?? null, myRoleName: mine?.roleName ?? null }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const createStaffLeave = async (req, res) => {
  try {
    const collegeId = req.tenant?.collegeId || req.user?.collegeId;
    const userId = req.user?.id || req.user?.userId;
    const { leaveType, fromDate, toDate, reason, proofFileName, proofMimeType, proofDataUrl } = req.body || {};

    if (NON_STAFF_ROLES.includes(req.user?.role)) {
      return fail(res, 403, 'FORBIDDEN', 'This form is only for staff members.');
    }

    if (!leaveType || !fromDate || !toDate || !reason?.trim()) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Leave type, from date, to date and reason are required.');
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (isNaN(from) || isNaN(to)) return fail(res, 400, 'INVALID_DATE', 'Invalid date supplied.');
    if (to < from) return fail(res, 400, 'INVALID_DATE_RANGE', 'To date cannot be before from date.');

    const { proof, error: proofError } = await buildProofPayload({
      proofFileName, proofMimeType, proofDataUrl, collegeId
    });

    if (proofError) return fail(res, 400, 'INVALID_PROOF', proofError);

    const mine = await resolveMyRole(userId, collegeId);
    const roleName = mine?.roleName || req.user?.role || 'Staff';

  let leave;
  try {
    leave = await prisma.leaveRequest.create({
      data: {
        collegeId,
        requesterUserId: userId,
        requesterRole: roleName,
        fromDate: from,
        toDate: to,
        reason: `[${String(leaveType).replace(/[\[\]]/g, '')}] ${reason.trim()}`,
        medicalCertUrl: proof,
        status: 'pending'
      }
    });
  } catch (dbErr) {
    await discardProof(proof);
    throw dbErr;
  }

res.status(201).json({ success: true, data: toSafeLeave(leave) });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const getMyLeaves = async (req, res) => {
  try {
    const collegeId = req.tenant?.collegeId || req.user?.collegeId;
    const userId = req.user?.id || req.user?.userId;

    const leaves = await prisma.leaveRequest.findMany({
      where: { collegeId, requesterUserId: userId },
      orderBy: { createdAt: 'desc' }
    });

    const data = leaves.map((l) => {
      const { leaveType, reason } = splitReason(l.reason);
      const proofMeta = parseProofMeta(l.medicalCertUrl);
      const { medicalCertUrl, ...rest } = l; 
      return { ...rest, leaveType, reason, roleName: l.requesterRole, ...proofMeta };
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};