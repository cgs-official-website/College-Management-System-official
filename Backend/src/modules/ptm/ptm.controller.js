import { randomUUID } from 'crypto';
import { prisma } from '../../server.js';
import { createSlotSchema, assignMeetingSchema, updateMeetingSchema } from './ptm.schema.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ADMIN_ROLES = ['admin', 'superadmin'];

const meetingInclude = {
  slot: true,
  teacher: { select: { id: true, designation: true, user: { select: { name: true, email: true } } } },
  student: { select: { id: true, rollNumber: true, user: { select: { name: true } } } },
};

const getUserId = (req) => req.user?.id || req.user?.userId;

const getTeacherProfile = (req) =>
  prisma.teacher.findFirst({
    where: { userId: getUserId(req), collegeId: req.tenant.collegeId, deletedAt: null },
  });

const fail = (res, status, code, message) =>
  res.status(status).json({ success: false, error: { code, message } });

const handleError = (res, error, duplicateMessage = 'Duplicate entry') => {
  if (error.name === 'ZodError') {
    return fail(res, 400, 'VALIDATION_ERROR', error.issues.map((i) => i.message).join(', '));
  }
  if (error.code === 'P2002') return fail(res, 409, 'DUPLICATE', duplicateMessage);
  if (error.message === 'SLOT_TAKEN') return fail(res, 409, 'SLOT_TAKEN', 'Slot is no longer available');
  return res.status(400).json({ success: false, error: { message: error.message } });
};

// ---------- SLOTS (teacher availability) ----------

export const createSlot = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const teacher = await getTeacherProfile(req);
    if (!teacher) return fail(res, 403, 'TEACHER_REQUIRED', 'Only teachers can create PTM slots');

    const payload = createSlotSchema.parse(req.body);
    const slot = await prisma.ptmSlot.create({
      data: {
        collegeId,
        teacherId: teacher.id,
        date: new Date(payload.date),
        startTime: payload.startTime,
        endTime: payload.endTime,
      },
    });
    res.status(201).json({ success: true, data: slot });
  } catch (error) {
    handleError(res, error, 'You already have a slot at this date and start time');
  }
};

export const getSlots = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const where = { collegeId };

    if (ADMIN_ROLES.includes(req.user?.role)) {
      if (req.query.teacherId) where.teacherId = req.query.teacherId;
    } else {
      const teacher = await getTeacherProfile(req);
      if (!teacher) return fail(res, 403, 'TEACHER_REQUIRED', 'Teacher profile not found');
      where.teacherId = teacher.id;
    }
    if (req.query.status) where.status = req.query.status;

    const slots = await prisma.ptmSlot.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
    res.json({ success: true, data: slots });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const deleteSlot = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const { id } = req.params;
    if (!id || !UUID_REGEX.test(id)) return fail(res, 400, 'INVALID_ID', 'Invalid slot ID format');

    const where = { id, collegeId };
    if (!ADMIN_ROLES.includes(req.user?.role)) {
      const teacher = await getTeacherProfile(req);
      if (!teacher) return fail(res, 403, 'TEACHER_REQUIRED', 'Teacher profile not found');
      where.teacherId = teacher.id;
    }

    const slot = await prisma.ptmSlot.findFirst({ where });
    if (!slot) return fail(res, 404, 'SLOT_NOT_FOUND', 'Slot not found');
    if (slot.status === 'booked') {
      return fail(res, 409, 'SLOT_BOOKED', 'Booked slot cannot be deleted. Cancel the meeting first.');
    }

    await prisma.ptmSlot.delete({ where: { id } });
    res.json({ success: true, data: { success: true } });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

// ---------- MEETINGS ----------

export const assignMeeting = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const teacher = await getTeacherProfile(req);
    if (!teacher) return fail(res, 403, 'TEACHER_REQUIRED', 'Only teachers can assign meetings');

    const payload = assignMeetingSchema.parse(req.body);
    if (payload.mode === 'offline' && !payload.venue) {
      return fail(res, 400, 'VENUE_REQUIRED', 'Venue is required for offline meetings');
    }

    const slot = await prisma.ptmSlot.findFirst({
      where: { id: payload.slotId, collegeId, teacherId: teacher.id },
    });
    if (!slot) return fail(res, 404, 'SLOT_NOT_FOUND', 'Slot not found');
    if (slot.status !== 'available') return fail(res, 409, 'SLOT_TAKEN', 'Slot is not available');

        const student = await prisma.student.findFirst({
      where: { id: payload.studentId, collegeId, deletedAt: null },
      select: { id: true, userId: true, departmentId: true },
    });
    if (!student) return fail(res, 404, 'STUDENT_NOT_FOUND', 'Student not found');
    if (student.departmentId !== teacher.departmentId) {
      return fail(res, 403, 'DEPARTMENT_MISMATCH', 'You can assign meetings only to students of your department');
    }

    // Meeting link auto-generation (Jitsi Meet, no API key needed)
    const meetingLink =
      payload.mode === 'online'
        ? `https://meet.jit.si/zuna-ptm-${randomUUID().replace(/-/g, '').slice(0, 16)}`
        : null;

    const meeting = await prisma.$transaction(async (tx) => {
      const updated = await tx.ptmSlot.updateMany({
        where: { id: slot.id, status: 'available' },
        data: { status: 'booked' },
      });
      if (updated.count === 0) throw new Error('SLOT_TAKEN');

      return tx.ptmMeeting.create({
        data: {
          collegeId,
          slotId: slot.id,
          teacherId: teacher.id,
          studentId: student.id,
          mode: payload.mode,
          meetingLink,
          venue: payload.mode === 'offline' ? payload.venue : null,
          agenda: payload.agenda ?? null,
        },
        include: meetingInclude,
      });
    });

    // Notify the student (non-fatal if it fails)
    try {
      await prisma.notification.create({
        data: {
          collegeId,
          userId: student.userId,
          title: 'PTM Meeting Scheduled',
          message: `A meeting has been scheduled on ${slot.date.toISOString().slice(0, 10)} at ${slot.startTime}.`,
          type: 'info',
          link: '/student/ptm',
        },
      });
    } catch (_) {}

    res.status(201).json({ success: true, data: meeting });
  } catch (error) {
    handleError(res, error);
  }
};

export const getMeetings = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const role = req.user?.role;
    const where = { collegeId };

    if (role === 'student') {
      const student = await prisma.student.findFirst({
        where: { userId: getUserId(req), collegeId },
        select: { id: true },
      });
      if (!student) return fail(res, 403, 'STUDENT_REQUIRED', 'Student profile not found');
      where.studentId = student.id;
    } else if (!ADMIN_ROLES.includes(role)) {
      const teacher = await getTeacherProfile(req);
      if (!teacher) return fail(res, 403, 'TEACHER_REQUIRED', 'Teacher profile not found');
      where.teacherId = teacher.id;
    }
    if (req.query.status) where.status = req.query.status;

    const meetings = await prisma.ptmMeeting.findMany({
      where,
      include: meetingInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: meetings });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const updateMeeting = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const { id } = req.params;
    if (!id || !UUID_REGEX.test(id)) return fail(res, 400, 'INVALID_ID', 'Invalid meeting ID format');

    const payload = updateMeetingSchema.parse(req.body);

    const where = { id, collegeId };
    if (!ADMIN_ROLES.includes(req.user?.role)) {
      const teacher = await getTeacherProfile(req);
      if (!teacher) return fail(res, 403, 'TEACHER_REQUIRED', 'Teacher profile not found');
      where.teacherId = teacher.id;
    }

    const existing = await prisma.ptmMeeting.findFirst({ where });
    if (!existing) return fail(res, 404, 'MEETING_NOT_FOUND', 'Meeting not found');
    if (existing.status !== 'scheduled') {
      return fail(res, 409, 'MEETING_CLOSED', `Meeting is already ${existing.status}`);
    }

    const data = {};
    if (payload.status !== undefined) data.status = payload.status;
    if (payload.teacherNotes !== undefined) data.teacherNotes = payload.teacherNotes;
    if (payload.agenda !== undefined) data.agenda = payload.agenda;

    const updated = await prisma.$transaction(async (tx) => {
      const meeting = await tx.ptmMeeting.update({ where: { id }, data, include: meetingInclude });
      if (payload.status === 'cancelled') {
        await tx.ptmSlot.update({ where: { id: existing.slotId }, data: { status: 'cancelled' } });
      }
      return meeting;
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    handleError(res, error);
  }
};
export const getPtmStudents = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const where = { collegeId, deletedAt: null };

    // Teachers see only students of their own department (e.g. MCA staff -> MCA students)
    if (!ADMIN_ROLES.includes(req.user?.role)) {
      const teacher = await getTeacherProfile(req);
      if (!teacher) return fail(res, 403, 'TEACHER_REQUIRED', 'Teacher profile not found');
      where.departmentId = teacher.departmentId;
    }

    const students = await prisma.student.findMany({
      where,
      select: {
        id: true,
        rollNumber: true,
        user: { select: { name: true } },
      },
      orderBy: { rollNumber: 'asc' },
      take: 1000,
    });
    res.json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};