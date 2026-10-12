import { randomUUID } from 'crypto';
import { prisma, logger } from '../../server.js';
import { createSlotSchema, assignMeetingSchema, updateMeetingSchema } from './ptm.schema.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ADMIN_ROLES = ['admin', 'superadmin', 'principal'];

let tablesInitialized = false;

/**
 * Ensures PtmSlot and PtmMeeting tables exist in PostgreSQL database.
 * Executes individual DDL statements safely.
 */
async function ensurePtmTablesExist() {
  if (tablesInitialized) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PtmSlot" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "collegeId" UUID NOT NULL,
        "teacherId" UUID NOT NULL,
        "date" DATE NOT NULL,
        "startTime" VARCHAR(50) NOT NULL,
        "endTime" VARCHAR(50) NOT NULL,
        "status" VARCHAR(50) NOT NULL DEFAULT 'available',
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PtmMeeting" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "collegeId" UUID NOT NULL,
        "slotId" UUID NOT NULL,
        "teacherId" UUID NOT NULL,
        "studentId" UUID NOT NULL,
        "mode" VARCHAR(50) NOT NULL DEFAULT 'online',
        "meetingLink" TEXT,
        "venue" TEXT,
        "agenda" TEXT,
        "teacherNotes" TEXT,
        "status" VARCHAR(50) NOT NULL DEFAULT 'scheduled',
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_ptmslot_college_teacher_date" ON "PtmSlot" ("collegeId", "teacherId", "date");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_ptmmeeting_slot" ON "PtmMeeting" ("slotId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_ptmmeeting_college_status" ON "PtmMeeting" ("collegeId", "status");
    `);

    tablesInitialized = true;
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      logger?.warn?.(`[PTM] Table initialization notice: ${err.message}`);
    }
  }
}

const meetingInclude = {
  slot: true,
  teacher: { select: { id: true, designation: true, user: { select: { name: true, email: true } } } },
  student: { select: { id: true, rollNumber: true, user: { select: { name: true, email: true } } } },
};

const getUserId = (req) => req.user?.id || req.user?.userId;

const getCollegeId = (req) => req.tenant?.collegeId || req.user?.collegeId || req.query?.collegeId;

const getTeacherProfile = async (req) => {
  const collegeId = getCollegeId(req);
  const userId = getUserId(req);
  if (!userId) return null;
  return prisma.teacher.findFirst({
    where: { userId, ...(collegeId ? { collegeId } : {}), deletedAt: null },
  });
};

const fail = (res, status, code, message) =>
  res.status(status).json({ success: false, error: { code, message } });

const handleError = (res, error, duplicateMessage = 'Duplicate entry') => {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[PTM] original error:', error);
  }
  if (error.name === 'ZodError') {
    return fail(res, 400, 'VALIDATION_ERROR', error.issues.map((i) => i.message).join(', '));
  }
  if (error.code === 'P2002') return fail(res, 409, 'DUPLICATE', duplicateMessage);
  if (error.message === 'SLOT_TAKEN') return fail(res, 409, 'SLOT_TAKEN', 'Slot is no longer available');
  
  if (process.env.NODE_ENV === 'development') {
    logger?.error?.(`[PTM] Error: ${error.message} - ${error.stack}`);
  }
  return res.status(400).json({ success: false, error: { message: error.message } });
};

// Safe DAO helpers with automatic raw SQL fallback if Prisma delegates are not yet generated
async function dbCreateSlot({ collegeId, teacherId, date, startTime, endTime }) {
  if (prisma.ptmSlot?.create) {
    return prisma.ptmSlot.create({
      data: {
        collegeId,
        teacherId,
        date: new Date(date),
        startTime,
        endTime,
      },
    });
  }
  const id = randomUUID();
  const dateObj = new Date(date);
  const rows = await prisma.$queryRawUnsafe(
    `INSERT INTO "PtmSlot" ("id", "collegeId", "teacherId", "date", "startTime", "endTime", "status", "createdAt", "updatedAt")
     VALUES ($1::uuid, $2::uuid, $3::uuid, $4::date, $5, $6, 'available', NOW(), NOW())
     RETURNING *;`,
    id, collegeId, teacherId, dateObj, startTime, endTime
  );
  return rows[0];
}

async function dbFindSlots({ collegeId, teacherId, status }) {
  if (prisma.ptmSlot?.findMany) {
    const where = {};
    if (collegeId) where.collegeId = collegeId;
    if (teacherId) where.teacherId = teacherId;
    if (status) where.status = status;
    return prisma.ptmSlot.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
  }
  let query = `SELECT * FROM "PtmSlot" WHERE 1=1`;
  const params = [];
  if (collegeId) {
    params.push(collegeId);
    query += ` AND "collegeId" = $${params.length}::uuid`;
  }
  if (teacherId) {
    params.push(teacherId);
    query += ` AND "teacherId" = $${params.length}::uuid`;
  }
  if (status) {
    params.push(status);
    query += ` AND "status" = $${params.length}`;
  }
  query += ` ORDER BY "date" ASC, "startTime" ASC`;
  return prisma.$queryRawUnsafe(query, ...params);
}

async function dbFindSlotById(id, collegeId = null, teacherId = null) {
  if (prisma.ptmSlot?.findFirst) {
    const where = { id };
    if (collegeId) where.collegeId = collegeId;
    if (teacherId) where.teacherId = teacherId;
    return prisma.ptmSlot.findFirst({ where });
  }
  let query = `SELECT * FROM "PtmSlot" WHERE "id" = $1::uuid`;
  const params = [id];
  if (collegeId) {
    params.push(collegeId);
    query += ` AND "collegeId" = $${params.length}::uuid`;
  }
  if (teacherId) {
    params.push(teacherId);
    query += ` AND "teacherId" = $${params.length}::uuid`;
  }
  const rows = await prisma.$queryRawUnsafe(query, ...params);
  return rows[0] || null;
}

async function dbDeleteSlot(id) {
  if (prisma.ptmSlot?.delete) {
    return prisma.ptmSlot.delete({ where: { id } });
  }
  await prisma.$executeRawUnsafe(`DELETE FROM "PtmSlot" WHERE "id" = $1::uuid;`, id);
  return { id };
}

async function dbCreateMeeting({ collegeId, slotId, teacherId, studentId, mode, meetingLink, venue, agenda }) {
  if (prisma.ptmSlot?.updateMany && prisma.ptmMeeting?.create) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.ptmSlot.updateMany({
        where: { id: slotId, status: 'available' },
        data: { status: 'booked' },
      });
      if (updated.count === 0) throw new Error('SLOT_TAKEN');

      return tx.ptmMeeting.create({
        data: {
          collegeId,
          slotId,
          teacherId,
          studentId,
          mode,
          meetingLink,
          venue: mode === 'offline' ? venue : null,
          agenda: agenda ?? null,
        },
        include: meetingInclude,
      });
    });
  }

  const slotRows = await prisma.$queryRawUnsafe(
    `UPDATE "PtmSlot" SET "status" = 'booked', "updatedAt" = NOW() WHERE "id" = $1::uuid AND "status" = 'available' RETURNING *;`,
    slotId
  );
  if (!slotRows || slotRows.length === 0) {
    throw new Error('SLOT_TAKEN');
  }

  const id = randomUUID();
  const venueVal = mode === 'offline' ? venue : null;
  const agendaVal = agenda ?? null;
  const meetingRows = await prisma.$queryRawUnsafe(
    `INSERT INTO "PtmMeeting" ("id", "collegeId", "slotId", "teacherId", "studentId", "mode", "meetingLink", "venue", "agenda", "status", "createdAt", "updatedAt")
     VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6, $7, $8, $9, 'scheduled', NOW(), NOW())
     RETURNING *;`,
    id, collegeId, slotId, teacherId, studentId, mode, meetingLink, venueVal, agendaVal
  );

  const meeting = meetingRows[0];
  const [slot, teacher, student] = await Promise.all([
    dbFindSlotById(slotId),
    prisma.teacher.findFirst({
      where: { id: teacherId },
      select: { id: true, designation: true, user: { select: { name: true, email: true } } },
    }),
    prisma.student.findFirst({
      where: { id: studentId },
      select: { id: true, rollNumber: true, user: { select: { name: true, email: true } } },
    }),
  ]);

  return {
    ...meeting,
    slot,
    teacher,
    student,
  };
}

async function dbFindMeetings({ collegeId, teacherId, studentId, status }) {
  if (prisma.ptmMeeting?.findMany) {
    const where = {};
    if (collegeId) where.collegeId = collegeId;
    if (teacherId) where.teacherId = teacherId;
    if (studentId) where.studentId = studentId;
    if (status) where.status = status;
    return prisma.ptmMeeting.findMany({
      where,
      include: meetingInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  let query = `
    SELECT 
      m.*,
      row_to_json(s.*) as slot,
      json_build_object('id', t.id, 'designation', t.designation, 'user', json_build_object('name', tu.name, 'email', tu.email)) as teacher,
      json_build_object('id', st.id, 'rollNumber', st."rollNumber", 'user', json_build_object('name', su.name, 'email', su.email)) as student
    FROM "PtmMeeting" m
    LEFT JOIN "PtmSlot" s ON m."slotId" = s.id
    LEFT JOIN "Teacher" t ON m."teacherId" = t.id
    LEFT JOIN "User" tu ON t."userId" = tu.id
    LEFT JOIN "Student" st ON m."studentId" = st.id
    LEFT JOIN "User" su ON st."userId" = su.id
    WHERE 1=1
  `;
  const params = [];
  if (collegeId) {
    params.push(collegeId);
    query += ` AND m."collegeId" = $${params.length}::uuid`;
  }
  if (teacherId) {
    params.push(teacherId);
    query += ` AND m."teacherId" = $${params.length}::uuid`;
  }
  if (studentId) {
    params.push(studentId);
    query += ` AND m."studentId" = $${params.length}::uuid`;
  }
  if (status) {
    params.push(status);
    query += ` AND m."status" = $${params.length}`;
  }
  query += ` ORDER BY m."createdAt" DESC`;
  const rows = await prisma.$queryRawUnsafe(query, ...params);
  return rows || [];
}

async function dbFindMeetingById(id, collegeId = null, teacherId = null) {
  if (prisma.ptmMeeting?.findFirst) {
    const where = { id };
    if (collegeId) where.collegeId = collegeId;
    if (teacherId) where.teacherId = teacherId;
    return prisma.ptmMeeting.findFirst({ where });
  }
  let query = `SELECT * FROM "PtmMeeting" WHERE "id" = $1::uuid`;
  const params = [id];
  if (collegeId) {
    params.push(collegeId);
    query += ` AND "collegeId" = $${params.length}::uuid`;
  }
  if (teacherId) {
    params.push(teacherId);
    query += ` AND "teacherId" = $${params.length}::uuid`;
  }
  const rows = await prisma.$queryRawUnsafe(query, ...params);
  return rows[0] || null;
}

async function dbUpdateMeeting(id, existing, data) {
  if (prisma.ptmMeeting?.update && prisma.ptmSlot?.update) {
    return prisma.$transaction(async (tx) => {
      const meeting = await tx.ptmMeeting.update({ where: { id }, data, include: meetingInclude });
      if (data.status === 'cancelled') {
        await tx.ptmSlot.update({ where: { id: existing.slotId }, data: { status: 'cancelled' } });
      }
      return meeting;
    });
  }

  const updates = ['"updatedAt" = NOW()'];
  const params = [id];
  if (data.status !== undefined) {
    params.push(data.status);
    updates.push(`"status" = $${params.length}`);
  }
  if (data.teacherNotes !== undefined) {
    params.push(data.teacherNotes);
    updates.push(`"teacherNotes" = $${params.length}`);
  }
  if (data.agenda !== undefined) {
    params.push(data.agenda);
    updates.push(`"agenda" = $${params.length}`);
  }

  const query = `UPDATE "PtmMeeting" SET ${updates.join(', ')} WHERE "id" = $1::uuid RETURNING *;`;
  const rows = await prisma.$queryRawUnsafe(query, ...params);
  const updatedMeeting = rows[0];

  if (data.status === 'cancelled') {
    await prisma.$executeRawUnsafe(
      `UPDATE "PtmSlot" SET "status" = 'cancelled', "updatedAt" = NOW() WHERE "id" = $1::uuid;`,
      existing.slotId
    );
  }

  const [slot, teacher, student] = await Promise.all([
    dbFindSlotById(existing.slotId),
    prisma.teacher.findFirst({
      where: { id: existing.teacherId },
      select: { id: true, designation: true, user: { select: { name: true, email: true } } },
    }),
    prisma.student.findFirst({
      where: { id: existing.studentId },
      select: { id: true, rollNumber: true, user: { select: { name: true, email: true } } },
    }),
  ]);

  return {
    ...updatedMeeting,
    slot,
    teacher,
    student,
  };
}

// ---------- SLOTS (teacher availability) ----------

export const createSlot = async (req, res) => {
  try {
    await ensurePtmTablesExist();
    const collegeId = getCollegeId(req);
    if (!collegeId) return fail(res, 400, 'COLLEGE_REQUIRED', 'College context is required');

    const teacher = await getTeacherProfile(req);
    if (!teacher) return fail(res, 403, 'TEACHER_REQUIRED', 'Only teachers can create PTM slots');

    const payload = createSlotSchema.parse(req.body);
    const slot = await dbCreateSlot({
      collegeId,
      teacherId: teacher.id,
      date: payload.date,
      startTime: payload.startTime,
      endTime: payload.endTime,
    });
    res.status(201).json({ success: true, data: slot });
  } catch (error) {
    handleError(res, error, 'You already have a slot at this date and start time');
  }
};

export const getSlots = async (req, res) => {
  try {
    await ensurePtmTablesExist();
    const collegeId = getCollegeId(req);
    let teacherId = undefined;

    const role = (req.user?.role || '').toLowerCase();
    if (ADMIN_ROLES.includes(role)) {
      if (req.query.teacherId) teacherId = req.query.teacherId;
    } else {
      const teacher = await getTeacherProfile(req);
      if (!teacher) {
        return res.json({ success: true, data: [] });
      }
      teacherId = teacher.id;
    }

    const slots = await dbFindSlots({
      collegeId,
      teacherId,
      status: req.query.status,
    });
    res.json({ success: true, data: slots || [] });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      logger?.error?.(`[PTM] getSlots Exception: ${error.message} - ${error.stack}`);
    }
    res.json({ success: true, data: [] });
  }
};

export const deleteSlot = async (req, res) => {
  try {
    await ensurePtmTablesExist();
    const collegeId = getCollegeId(req);
    const { id } = req.params;
    if (!id || !UUID_REGEX.test(id)) return fail(res, 400, 'INVALID_ID', 'Invalid slot ID format');

    let teacherId = null;
    const role = (req.user?.role || '').toLowerCase();
    if (!ADMIN_ROLES.includes(role)) {
      const teacher = await getTeacherProfile(req);
      if (!teacher) return fail(res, 403, 'TEACHER_REQUIRED', 'Teacher profile not found');
      teacherId = teacher.id;
    }

    const slot = await dbFindSlotById(id, collegeId, teacherId);
    if (!slot) return fail(res, 404, 'SLOT_NOT_FOUND', 'Slot not found');
    if (slot.status === 'booked') {
      return fail(res, 409, 'SLOT_BOOKED', 'Booked slot cannot be deleted. Cancel the meeting first.');
    }

    await dbDeleteSlot(id);
    res.json({ success: true, data: { success: true } });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
};

// ---------- MEETINGS ----------

export const assignMeeting = async (req, res) => {
  try {
    await ensurePtmTablesExist();
    const collegeId = getCollegeId(req);
    if (!collegeId) return fail(res, 400, 'COLLEGE_REQUIRED', 'College context is required');

    const teacher = await getTeacherProfile(req);
    if (!teacher) return fail(res, 403, 'TEACHER_REQUIRED', 'Only teachers can assign meetings');

    const payload = assignMeetingSchema.parse(req.body);
    if (payload.mode === 'offline' && !payload.venue) {
      return fail(res, 400, 'VENUE_REQUIRED', 'Venue is required for offline meetings');
    }

    const slot = await dbFindSlotById(payload.slotId, collegeId, teacher.id);
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
    let meetingLink = null;
    if (payload.mode === 'online') {
      const college = await prisma.college.findUnique({
        where: { id: collegeId },
        select: { name: true, slug: true },
      });

      const collegeName = college?.name || 'College';
      const collegeSlug = college?.slug || 'college';
      const uniqueId = randomUUID().replace(/-/g, '').slice(0, 16);

      meetingLink =
        `https://meet.jit.si/${collegeSlug}-ptm-${uniqueId}` +
        `#config.subject=${encodeURIComponent(JSON.stringify(collegeName))}`;
    }

    const meeting = await dbCreateMeeting({
      collegeId,
      slotId: slot.id,
      teacherId: teacher.id,
      studentId: student.id,
      mode: payload.mode,
      meetingLink,
      venue: payload.venue,
      agenda: payload.agenda,
    });

    // Notify the student (non-fatal if it fails)
    if (prisma.notification?.create && student.userId) {
      try {
        await prisma.notification.create({
          data: {
            collegeId,
            userId: student.userId,
            title: 'PTM Meeting Scheduled',
            message: `A meeting has been scheduled on ${slot.date ? new Date(slot.date).toISOString().slice(0, 10) : ''} at ${slot.startTime}.`,
            type: 'info',
            link: '/student/ptm',
          },
        });
      } catch (_) {}
    }

    res.status(201).json({ success: true, data: meeting });
  } catch (error) {
    handleError(res, error);
  }
};

export const getMeetings = async (req, res) => {
  try {
    await ensurePtmTablesExist();
    const collegeId = getCollegeId(req);
    const role = (req.user?.role || '').toLowerCase();
    let studentId = undefined;
    let teacherId = undefined;

    if (role === 'student') {
      const student = await prisma.student.findFirst({
        where: { userId: getUserId(req), ...(collegeId ? { collegeId } : {}) },
        select: { id: true },
      });
      if (!student) {
        return res.json({ success: true, data: [] });
      }
      studentId = student.id;
    } else if (!ADMIN_ROLES.includes(role)) {
      const teacher = await getTeacherProfile(req);
      if (!teacher) {
        return res.json({ success: true, data: [] });
      }
      teacherId = teacher.id;
    }

    const meetings = await dbFindMeetings({
      collegeId,
      teacherId,
      studentId,
      status: req.query.status,
    });
    return res.json({ success: true, data: meetings || [] });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      logger?.error?.(`[PTM] getMeetings Exception: ${error.message} - ${error.stack}`);
    }
    res.json({ success: true, data: [] });
  }
};

export const updateMeeting = async (req, res) => {
  try {
    await ensurePtmTablesExist();
    const collegeId = getCollegeId(req);
    const { id } = req.params;
    if (!id || !UUID_REGEX.test(id)) return fail(res, 400, 'INVALID_ID', 'Invalid meeting ID format');

    const payload = updateMeetingSchema.parse(req.body);

    let teacherId = null;
    const role = (req.user?.role || '').toLowerCase();
    if (!ADMIN_ROLES.includes(role)) {
      const teacher = await getTeacherProfile(req);
      if (!teacher) return fail(res, 403, 'TEACHER_REQUIRED', 'Teacher profile not found');
      teacherId = teacher.id;
    }

    const existing = await dbFindMeetingById(id, collegeId, teacherId);
    if (!existing) return fail(res, 404, 'MEETING_NOT_FOUND', 'Meeting not found');
    if (existing.status !== 'scheduled') {
      return fail(res, 409, 'MEETING_CLOSED', `Meeting is already ${existing.status}`);
    }

    const data = {};
    if (payload.status !== undefined) data.status = payload.status;
    if (payload.teacherNotes !== undefined) data.teacherNotes = payload.teacherNotes;
    if (payload.agenda !== undefined) data.agenda = payload.agenda;

    const updated = await dbUpdateMeeting(id, existing, data);
    res.json({ success: true, data: updated });
  } catch (error) {
    handleError(res, error);
  }
};

export const getPtmStudents = async (req, res) => {
  try {
    await ensurePtmTablesExist();
    const collegeId = getCollegeId(req);
    const where = { deletedAt: null };
    if (collegeId) where.collegeId = collegeId;

    const role = (req.user?.role || '').toLowerCase();
    if (!ADMIN_ROLES.includes(role)) {
      const teacher = await getTeacherProfile(req);
      if (!teacher) return res.json({ success: true, data: [] });

      console.log('PTM teacher dept:', teacher.departmentId);
      const all = await prisma.student.findMany({
        where: { collegeId },
        select: { rollNumber: true, departmentId: true, deletedAt: true },
      });
      console.log('PTM students:', all);

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
    res.json({ success: true, data: students || [] });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      logger?.error?.(`[PTM] getPtmStudents Exception: ${error.message} - ${error.stack}`);
    }
    res.json({ success: true, data: [] });
  }
};
