import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { z } from 'zod';
import { notify } from '../notifications/notify.service.js';
import { checkHallConflict, normalizeHall, normalizeTime } from './exams.controller.js';

const ctx = (req) => ({
  collegeId: req.tenant?.collegeId || req.user?.collegeId,
  userId: req.user?.id || req.user?.userId,
  role: req.user?.role,
});

const fail = (res, status, message, code) =>
  res.status(status).json({ success: false, error: { code: code || 'ERROR', message } });

const isAdminRole = (role) => role === 'admin' || role === 'superadmin';
const dayKey = (d) => new Date(d).toISOString().split('T')[0];
const DAY_MS = 24 * 60 * 60 * 1000;

const getTeacher = (collegeId, userId) =>
  prisma.teacher.findFirst({ where: { collegeId, userId, deletedAt: null }, select: { id: true } });

// The semester most students of a section are in
async function sectionSemester(collegeId, sectionId) {
  const rows = await prisma.student.groupBy({
    by: ['currentSemester'],
    where: { collegeId, sectionId, deletedAt: null, currentSemester: { not: null } },
    _count: { _all: true },
  });
  if (!rows.length) return null;
  return rows.reduce((a, b) => (b._count._all > a._count._all ? b : a)).currentSemester;
}

async function notifySection(collegeId, sectionId, title, message) {
  try {
    const students = await prisma.student.findMany({
      where: { collegeId, sectionId, deletedAt: null, userId: { not: null } },
      select: { userId: true },
    });
    const userIds = [...new Set(students.map((s) => s.userId).filter(Boolean))];
    if (userIds.length) {
      await notify({
        collegeId,
        target: { userIds },
        type: 'exam_marks',
        title,
        message,
        link: '/student/exams',
      });
    }
  } catch (err) {
    logger.error(`[ExamCenter] notify error: ${err.message}`);
  }
}


/* Exam types */

const typeSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  defaultMaxMarks: z.number().min(1).default(100),
  isActive: z.boolean().optional(),
});

export const listExamTypes = async (req, res) => {
  const { collegeId } = ctx(req);
  const data = await prisma.examType.findMany({ where: { collegeId }, orderBy: { createdAt: 'asc' } });
  res.json({ success: true, data });
};

export const createExamType = async (req, res) => {
  const { collegeId } = ctx(req);
  const body = typeSchema.parse(req.body);
  const dup = await prisma.examType.findFirst({
    where: { collegeId, name: { equals: body.name, mode: 'insensitive' } },
  });
  if (dup) return fail(res, 400, `Exam type "${body.name}" already exists`);
  const data = await prisma.examType.create({
    data: { collegeId, name: body.name, defaultMaxMarks: body.defaultMaxMarks },
  });
  res.status(201).json({ success: true, data });
};

export const updateExamType = async (req, res) => {
  const { collegeId } = ctx(req);
  const { id } = req.params;
  const body = typeSchema.parse(req.body);
  const existing = await prisma.examType.findFirst({ where: { id, collegeId } });
  if (!existing) return fail(res, 404, 'Exam type not found');
  const dup = await prisma.examType.findFirst({
    where: { collegeId, id: { not: id }, name: { equals: body.name, mode: 'insensitive' } },
  });
  if (dup) return fail(res, 400, `Exam type "${body.name}" already exists`);

  const data = await prisma.examType.update({
    where: { id },
    data: {
      name: body.name,
      defaultMaxMarks: body.defaultMaxMarks,
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    },
  });
  if (existing.name !== body.name) {
    await prisma.exam.updateMany({ where: { examTypeId: id }, data: { name: body.name, type: body.name } });
  }
  res.json({ success: true, data });
};

export const deleteExamType = async (req, res) => {
  const { collegeId } = ctx(req);
  const { id } = req.params;
  const existing = await prisma.examType.findFirst({ where: { id, collegeId } });
  if (!existing) return fail(res, 404, 'Exam type not found');
  const used = await prisma.exam.count({ where: { examTypeId: id } });
  if (used > 0) {
    return fail(res, 400, 'This exam type is already used in schedules. Mark it inactive instead of deleting.');
  }
  await prisma.examType.delete({ where: { id } });
  res.json({ success: true, data: { success: true } });
};

/* Scheduling  */                                        

const itemSchema = z.object({
  subjectId: z.string().uuid(),
  date: z.string().min(8, 'Date is required'),
  startTime: z.string().nullish(),
  endTime: z.string().nullish(),
  room: z.string().nullish(),
  maxMarks: z.number().min(1),
});

const scheduleSchema = z.object({
  examTypeId: z.string().uuid(),
  courseId: z.string().uuid(),
  semester: z.number().int().min(1),
  items: z.array(itemSchema).min(1, 'Select at least one subject'),
});

const roomsOverlap = (a, b) => {
  if (dayKey(a.date) !== dayKey(b.date)) return false;
  if (!a.room?.trim() || !b.room?.trim()) return false;
  if (normalizeHall(a.room) !== normalizeHall(b.room)) return false;
  const as = normalizeTime(a.startTime), ae = normalizeTime(a.endTime);
  const bs = normalizeTime(b.startTime), be = normalizeTime(b.endTime);
  if (!as || !ae || !bs || !be) return true;
  return as < be && ae > bs;
};

// Subjects of a semester, ready for the admin to fill in dates
export const previewSchedule = async (req, res) => {
  const { collegeId } = ctx(req);
  const { examTypeId, courseId } = req.query;
  const semester = parseInt(req.query.semester, 10);
  if (!examTypeId || !courseId || !Number.isInteger(semester)) {
    return fail(res, 400, 'examTypeId, courseId and semester are required');
  }
  const [type, course] = await Promise.all([
    prisma.examType.findFirst({ where: { id: examTypeId, collegeId } }),
    prisma.course.findFirst({ where: { id: courseId, collegeId } }),
  ]);
  if (!type) return fail(res, 404, 'Exam type not found');
  if (!course) return fail(res, 404, 'Program not found');
  if (semester < 1 || semester > course.semester) {
    return fail(res, 400, `Semester must be between 1 and ${course.semester}`);
  }
  const subjects = await prisma.subject.findMany({
    where: { collegeId, courseId, semester, isActive: true },
    orderBy: { code: 'asc' },
  });
  res.json({
    success: true,
    data: {
      examType: { id: type.id, name: type.name, defaultMaxMarks: type.defaultMaxMarks },
      course: { id: course.id, name: course.name, totalSemesters: course.semester },
      semester,
      subjects: subjects.map((s) => ({
        id: s.id, code: s.code, name: s.name, type: s.type, maxMarks: type.defaultMaxMarks,
      })),
    },
  });
};

export const createSchedule = async (req, res) => {
  const { collegeId } = ctx(req);
  const body = scheduleSchema.parse(req.body);

  const [type, course] = await Promise.all([
    prisma.examType.findFirst({ where: { id: body.examTypeId, collegeId, isActive: true } }),
    prisma.course.findFirst({ where: { id: body.courseId, collegeId } }),
  ]);
  if (!type) return fail(res, 404, 'Exam type not found or inactive');
  if (!course) return fail(res, 404, 'Program not found');
  if (body.semester > course.semester) {
    return fail(res, 400, `Semester must be between 1 and ${course.semester}`);
  }

  const subjects = await prisma.subject.findMany({
    where: {
      id: { in: body.items.map((i) => i.subjectId) },
      collegeId, courseId: body.courseId, semester: body.semester, isActive: true,
    },
  });
  const byId = new Map(subjects.map((s) => [s.id, s]));

  const seen = new Set();
  for (const item of body.items) {
    if (!byId.has(item.subjectId)) return fail(res, 400, 'A selected subject does not belong to this program and semester');
    if (seen.has(item.subjectId)) return fail(res, 400, 'A subject appears twice in the schedule');
    seen.add(item.subjectId);
    if (isNaN(new Date(item.date).getTime())) return fail(res, 400, 'Invalid exam date');
  }

  for (let i = 0; i < body.items.length; i++) {
    for (let j = i + 1; j < body.items.length; j++) {
      if (roomsOverlap(body.items[i], body.items[j])) {
        const a = byId.get(body.items[i].subjectId).name;
        const b = byId.get(body.items[j].subjectId).name;
        return fail(res, 409, `${a} and ${b} use the same hall at the same time`, 'HALL_CONFLICT');
      }
    }
  }

  for (const item of body.items) {
    const subject = byId.get(item.subjectId);
    const d = new Date(item.date);
    const dup = await prisma.exam.findFirst({
      where: {
        collegeId, examTypeId: type.id, subjectId: item.subjectId,
        date: { gte: new Date(d.getTime() - 150 * DAY_MS), lte: new Date(d.getTime() + 150 * DAY_MS) },
      },
    });
    if (dup) return fail(res, 409, `${subject.name} is already scheduled for ${type.name}`, 'ALREADY_SCHEDULED');

    const conflict = await checkHallConflict(collegeId, {
      date: item.date, room: item.room, startTime: item.startTime, endTime: item.endTime,
    });
    if (conflict) return fail(res, 409, conflict, 'HALL_CONFLICT');
  }

  const created = await prisma.$transaction(
    body.items.map((item) => {
      const subject = byId.get(item.subjectId);
      return prisma.exam.create({
        data: {
          collegeId,
          courseId: body.courseId,
          semester: body.semester,
          subjectId: subject.id,
          examTypeId: type.id,
          name: type.name,
          type: type.name,
          subject: subject.name,
          date: new Date(item.date),
          maxMarks: item.maxMarks,
          status: 'pending',
          room: item.room?.trim() || 'Main Hall',
          startTime: item.startTime || null,
          endTime: item.endTime || null,
        },
      });
    })
  );

  try {
    const students = await prisma.student.findMany({
      where: { collegeId, courseId: body.courseId, currentSemester: body.semester, deletedAt: null, userId: { not: null } },
      select: { userId: true },
    });
    const userIds = [...new Set(students.map((s) => s.userId).filter(Boolean))];
    if (userIds.length) {
      await notify({
        collegeId,
        target: { userIds },
        type: 'exam_scheduled',
        title: 'Exam Scheduled',
        message: `${type.name} timetable for ${course.name} Semester ${body.semester} has been published.`,
        link: '/student/exams',
      });
    }
  } catch (err) {
    logger.error(`[ExamCenter] schedule notify error: ${err.message}`);
  }

  res.status(201).json({ success: true, data: { count: created.length } });
};

export const listSchedule = async (req, res) => {
  const { collegeId } = ctx(req);
  const { courseId, examTypeId } = req.query;
  const where = { collegeId, examTypeId: examTypeId || { not: null } };
  if (courseId) where.courseId = courseId;
  if (req.query.semester) where.semester = parseInt(req.query.semester, 10);

  const exams = await prisma.exam.findMany({
    where,
    include: {
      subjectRef: { select: { id: true, code: true, name: true, type: true } },
      examTypeRef: { select: { id: true, name: true } },
      course: { select: { id: true, name: true, code: true } },
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });

  res.json({
    success: true,
    data: exams.map((e) => ({
      id: e.id,
      examTypeId: e.examTypeId,
      examTypeName: e.examTypeRef?.name || e.type,
      courseId: e.courseId,
      courseName: e.course?.name,
      semester: e.semester,
      subject: e.subjectRef,
      date: dayKey(e.date),
      startTime: e.startTime,
      endTime: e.endTime,
      room: e.room,
      maxMarks: e.maxMarks,
    })),
  });
};

const updateItemSchema = z.object({
  date: z.string().optional(),
  startTime: z.string().nullish(),
  endTime: z.string().nullish(),
  room: z.string().nullish(),
  maxMarks: z.number().min(1).optional(),
});

export const updateScheduleItem = async (req, res) => {
  const { collegeId } = ctx(req);
  const { id } = req.params;
  const body = updateItemSchema.parse(req.body);

  const exam = await prisma.exam.findFirst({ where: { id, collegeId, examTypeId: { not: null } } });
  if (!exam) return fail(res, 404, 'Exam not found');

  if (body.maxMarks !== undefined && body.maxMarks < exam.maxMarks) {
    const over = await prisma.mark.count({ where: { examId: id, obtainedMarks: { gt: body.maxMarks } } });
    if (over > 0) return fail(res, 400, 'Some entered marks are higher than the new maximum');
  }

  const conflict = await checkHallConflict(collegeId, {
    date: body.date ?? exam.date,
    room: body.room !== undefined ? body.room : exam.room,
    startTime: body.startTime !== undefined ? body.startTime : exam.startTime,
    endTime: body.endTime !== undefined ? body.endTime : exam.endTime,
    excludeId: id,
  });
  if (conflict) return fail(res, 409, conflict, 'HALL_CONFLICT');

  const data = await prisma.exam.update({
    where: { id },
    data: {
      ...(body.date ? { date: new Date(body.date) } : {}),
      ...(body.startTime !== undefined ? { startTime: body.startTime || null } : {}),
      ...(body.endTime !== undefined ? { endTime: body.endTime || null } : {}),
      ...(body.room !== undefined ? { room: body.room?.trim() || 'Main Hall' } : {}),
      ...(body.maxMarks !== undefined ? { maxMarks: body.maxMarks } : {}),
    },
  });
  res.json({ success: true, data });
};

export const deleteScheduleItem = async (req, res) => {
  const { collegeId } = ctx(req);
  const { id } = req.params;
  const exam = await prisma.exam.findFirst({ where: { id, collegeId, examTypeId: { not: null } } });
  if (!exam) return fail(res, 404, 'Exam not found');
  const marks = await prisma.mark.count({ where: { examId: id } });
  if (marks > 0) return fail(res, 400, 'Marks are already entered for this exam, so it cannot be deleted');
  await prisma.exam.delete({ where: { id } });
  res.json({ success: true, data: { success: true } });
};


async function currentExams(collegeId, { examTypeId, courseId, semester }) {
  const exams = await prisma.exam.findMany({
    where: { collegeId, examTypeId, courseId, semester },
    include: { subjectRef: { select: { id: true, code: true, name: true, type: true } } },
    orderBy: { date: 'desc' },
  });
  const seen = new Set();
  const out = [];
  for (const e of exams) {
    if (!e.subjectId || seen.has(e.subjectId)) continue;
    seen.add(e.subjectId);
    out.push(e);
  }
  return out.sort((a, b) => a.subjectRef.code.localeCompare(b.subjectRef.code));
}

export const getReview = async (req, res) => {
  const { collegeId } = ctx(req);
  const { examTypeId, courseId } = req.query;
  const semester = parseInt(req.query.semester, 10);
  if (!examTypeId || !courseId || !Number.isInteger(semester)) {
    return fail(res, 400, 'examTypeId, courseId and semester are required');
  }

  const exams = await currentExams(collegeId, { examTypeId, courseId, semester });
  const allSections = await prisma.section.findMany({ where: { collegeId, courseId }, orderBy: { name: 'asc' } });

  const sections = [];
  for (const s of allSections) {
    const sem = await sectionSemester(collegeId, s.id);
    if (sem === semester) sections.push(s);
  }

  if (!exams.length || !sections.length) {
    return res.json({ success: true, data: { sections: sections.map((s) => ({ id: s.id, name: s.name, students: 0 })), rows: [] } });
  }

  const examIds = exams.map((e) => e.id);
  const sectionIds = sections.map((s) => s.id);
  const subjectIds = exams.map((e) => e.subjectId);

  const [studentCounts, statuses, marks, assignments] = await Promise.all([
    prisma.student.groupBy({
      by: ['sectionId'],
      where: { collegeId, sectionId: { in: sectionIds }, deletedAt: null },
      _count: { _all: true },
    }),
    prisma.examSectionStatus.findMany({ where: { examId: { in: examIds }, sectionId: { in: sectionIds } } }),
    prisma.mark.findMany({
      where: { examId: { in: examIds }, student: { sectionId: { in: sectionIds }, deletedAt: null } },
      select: { examId: true, obtainedMarks: true, isAbsent: true, student: { select: { sectionId: true } } },
    }),
    prisma.teachingAssignment.findMany({
      where: { collegeId, sectionId: { in: sectionIds }, subjectId: { in: subjectIds } },
      include: { teacher: { select: { user: { select: { name: true } } } } },
    }),
  ]);

  const totalBySection = new Map(studentCounts.map((c) => [c.sectionId, c._count._all]));
  const statusMap = new Map(statuses.map((s) => [`${s.examId}:${s.sectionId}`, s]));
  const teacherMap = new Map(assignments.map((a) => [`${a.subjectId}:${a.sectionId}`, a.teacher?.user?.name || null]));
  const enteredMap = new Map();
  for (const m of marks) {
    if (m.obtainedMarks === null && !m.isAbsent) continue;
    const key = `${m.examId}:${m.student.sectionId}`;
    enteredMap.set(key, (enteredMap.get(key) || 0) + 1);
  }

  const rows = exams.map((e) => {
    const cells = {};
    for (const s of sections) {
      const key = `${e.id}:${s.id}`;
      const st = statusMap.get(key);
      const entered = enteredMap.get(key) || 0;
      cells[s.id] = {
        status: st?.status || (entered > 0 ? 'DRAFT' : 'NOT_STARTED'),
        entered,
        total: totalBySection.get(s.id) || 0,
        teacher: teacherMap.get(`${e.subjectId}:${s.id}`) || null,
        remark: st?.adminRemark || null,
      };
    }
    return {
      exam: { id: e.id, date: dayKey(e.date), maxMarks: e.maxMarks, subject: e.subjectRef },
      cells,
    };
  });

  res.json({
    success: true,
    data: {
      sections: sections.map((s) => ({ id: s.id, name: s.name, students: totalBySection.get(s.id) || 0 })),
      rows,
    },
  });
};

const actionSchema = z.object({
  examId: z.string().uuid(),
  sectionId: z.string().uuid(),
  action: z.enum(['publish', 'send_back', 'unpublish']),
  remark: z.string().trim().max(500).optional(),
});

export const reviewAction = async (req, res) => {
  const { collegeId } = ctx(req);
  const body = actionSchema.parse(req.body);

  const st = await prisma.examSectionStatus.findFirst({
    where: { examId: body.examId, sectionId: body.sectionId, collegeId },
    include: {
      exam: { select: { type: true, subject: true } },
    },
  });
  if (!st) return fail(res, 404, 'Nothing has been submitted for this subject and section yet');

  const label = `${st.exam.type} - ${st.exam.subject || 'Subject'}`;
  let data;

  if (body.action === 'publish') {
    if (st.status !== 'SENT_TO_ADMIN') return fail(res, 409, 'Only marks sent by the teacher can be published');
    data = await prisma.examSectionStatus.update({
      where: { id: st.id },
      data: { status: 'PUBLISHED', publishedAt: new Date(), adminRemark: null },
    });
    await notifySection(collegeId, body.sectionId, 'Internal Marks Published', `Your marks for ${label} are now available.`);
  } else if (body.action === 'send_back') {
    if (st.status !== 'SENT_TO_ADMIN') return fail(res, 409, 'Only marks sent by the teacher can be sent back');
    if (!body.remark) return fail(res, 400, 'Please add a remark explaining what to correct');
    data = await prisma.examSectionStatus.update({
      where: { id: st.id },
      data: { status: 'DRAFT', adminRemark: body.remark, submittedAt: null },
    });
  } else {
    if (st.status !== 'PUBLISHED') return fail(res, 409, 'Only published marks can be withdrawn');
    data = await prisma.examSectionStatus.update({
      where: { id: st.id },
      data: { status: 'SENT_TO_ADMIN', publishedAt: null },
    });
  }

  res.json({ success: true, data });
};

const publishAllSchema = z.object({
  examTypeId: z.string().uuid(),
  courseId: z.string().uuid(),
  semester: z.number().int().min(1),
  sectionId: z.string().uuid(),
});

export const publishAll = async (req, res) => {
  const { collegeId } = ctx(req);
  const body = publishAllSchema.parse(req.body);

  const result = await prisma.examSectionStatus.updateMany({
    where: {
      collegeId,
      sectionId: body.sectionId,
      status: 'SENT_TO_ADMIN',
      exam: { examTypeId: body.examTypeId, courseId: body.courseId, semester: body.semester },
    },
    data: { status: 'PUBLISHED', publishedAt: new Date(), adminRemark: null },
  });

  if (result.count > 0) {
    const type = await prisma.examType.findFirst({ where: { id: body.examTypeId, collegeId }, select: { name: true } });
    await notifySection(collegeId, body.sectionId, 'Internal Marks Published', `Your ${type?.name || 'exam'} marks are now available.`);
  }
  res.json({ success: true, data: { published: result.count } });
};

/* ------------------------------------------------------------------ */
/* Teacher: classes and marks entry                                    */
/* ------------------------------------------------------------------ */

export const teacherClasses = async (req, res) => {
  const { collegeId, userId } = ctx(req);
  const teacher = await getTeacher(collegeId, userId);
  if (!teacher) return res.json({ success: true, data: [] });

  const assignments = await prisma.teachingAssignment.findMany({
    where: { collegeId, teacherId: teacher.id },
    include: {
      subject: { select: { id: true, code: true, name: true, type: true, semester: true } },
      section: { select: { id: true, name: true, course: { select: { id: true, name: true } } } },
    },
  });

  const semCache = new Map();
  const out = [];

  for (const a of assignments) {
    if (!semCache.has(a.sectionId)) semCache.set(a.sectionId, await sectionSemester(collegeId, a.sectionId));
    const sem = semCache.get(a.sectionId);
    if (sem === null || sem !== a.subject.semester) continue; 

    const exams = await prisma.exam.findMany({
      where: { collegeId, subjectId: a.subjectId, semester: sem, examTypeId: { not: null } },
      include: {
        examTypeRef: { select: { id: true, name: true } },
        sectionStatuses: { where: { sectionId: a.sectionId } },
      },
      orderBy: { date: 'desc' },
    });

    const picked = new Map();
    for (const e of exams) {
      const cur = picked.get(e.examTypeId);
      if (!cur || (e.sectionStatuses.length > 0 && cur.sectionStatuses.length === 0)) picked.set(e.examTypeId, e);
    }

    for (const e of picked.values()) {
      const st = e.sectionStatuses[0];
      out.push({
        examId: e.id,
        examTypeName: e.examTypeRef?.name || e.type,
        sectionId: a.sectionId,
        sectionName: a.section.name,
        courseName: a.section.course?.name,
        semester: sem,
        subject: a.subject,
        date: dayKey(e.date),
        maxMarks: e.maxMarks,
        status: st?.status || 'NOT_STARTED',
        remark: st?.adminRemark || null,
      });
    }
  }

  res.json({ success: true, data: out });
};

async function authorizeMarks(req, res, examId, sectionId) {
  const { collegeId, userId, role } = ctx(req);

  const exam = await prisma.exam.findFirst({
    where: { id: examId, collegeId, examTypeId: { not: null } },
    include: {
      subjectRef: { select: { id: true, code: true, name: true, type: true } },
      examTypeRef: { select: { name: true } },
    },
  });
  if (!exam) { fail(res, 404, 'Exam not found'); return null; }

  const section = await prisma.section.findFirst({ where: { id: sectionId, collegeId } });
  if (!section || section.courseId !== exam.courseId) { fail(res, 400, 'This section does not belong to the exam\'s program'); return null; }

  let teacher = null;
  if (!isAdminRole(role)) {
    teacher = await getTeacher(collegeId, userId);
    const assigned = teacher && await prisma.teachingAssignment.findFirst({
      where: { collegeId, teacherId: teacher.id, sectionId, subjectId: exam.subjectId },
    });
    if (!assigned) { fail(res, 403, 'You are not assigned to teach this subject in this section'); return null; }
  }
  return { collegeId, exam, section, teacher };
}

export const getMarksSheet = async (req, res) => {
  const { examId, sectionId } = req.params;
  const a = await authorizeMarks(req, res, examId, sectionId);
  if (!a) return;

  const students = await prisma.student.findMany({
    where: { collegeId: a.collegeId, sectionId, deletedAt: null },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { rollNumber: 'asc' },
  });
  const [marks, st] = await Promise.all([
    prisma.mark.findMany({ where: { examId, studentId: { in: students.map((s) => s.id) } } }),
    prisma.examSectionStatus.findUnique({ where: { examId_sectionId: { examId, sectionId } } }),
  ]);
  const markMap = new Map(marks.map((m) => [m.studentId, m]));

  res.json({
    success: true,
    data: {
      exam: {
        id: a.exam.id,
        examTypeName: a.exam.examTypeRef?.name || a.exam.type,
        subject: a.exam.subjectRef,
        maxMarks: a.exam.maxMarks,
        date: dayKey(a.exam.date),
      },
      section: { id: a.section.id, name: a.section.name },
      status: st?.status || 'DRAFT',
      remark: st?.adminRemark || null,
      students: students.map((s) => {
        const m = markMap.get(s.id);
        return {
          id: s.id,
          rollNumber: s.rollNumber,
          registerNumber: s.registerNumber,
          name: s.user?.name || s.user?.email || 'Student',
          obtainedMarks: m?.obtainedMarks ?? null,
          isAbsent: m?.isAbsent || false,
        };
      }),
    },
  });
};

const saveSchema = z.object({
  records: z.array(z.object({
    studentId: z.string().uuid(),
    obtainedMarks: z.number().min(0).nullish(),
    isAbsent: z.boolean().optional(),
  })),
});

export const saveMarks = async (req, res) => {
  const { examId, sectionId } = req.params;
  const body = saveSchema.parse(req.body);
  const a = await authorizeMarks(req, res, examId, sectionId);
  if (!a) return;
  if (!a.teacher) return fail(res, 403, 'Only the assigned teacher can enter marks');

  const st = await prisma.examSectionStatus.findUnique({ where: { examId_sectionId: { examId, sectionId } } });
  if (st && st.status !== 'DRAFT') return fail(res, 409, 'Marks are locked. Ask the admin to send them back to edit.');

  const sectionStudents = await prisma.student.findMany({
    where: { collegeId: a.collegeId, sectionId, deletedAt: null },
    select: { id: true },
  });
  const allowed = new Set(sectionStudents.map((s) => s.id));

  const ops = [
    prisma.examSectionStatus.upsert({
      where: { examId_sectionId: { examId, sectionId } },
      update: {},
      create: { collegeId: a.collegeId, examId, sectionId, status: 'DRAFT' },
    }),
  ];

  for (const r of body.records) {
    if (!allowed.has(r.studentId)) return fail(res, 400, 'A student in the list does not belong to this section');
    const absent = !!r.isAbsent;
    const hasValue = r.obtainedMarks !== null && r.obtainedMarks !== undefined;

    if (!absent && !hasValue) {
      ops.push(prisma.mark.deleteMany({ where: { examId, studentId: r.studentId } }));
      continue;
    }
    if (!absent && r.obtainedMarks > a.exam.maxMarks) {
      return fail(res, 422, `Marks cannot be more than ${a.exam.maxMarks}`, 'MAX_MARKS_EXCEEDED');
    }
    const value = absent ? null : r.obtainedMarks;
    ops.push(prisma.mark.upsert({
      where: { examId_studentId: { examId, studentId: r.studentId } },
      update: { obtainedMarks: value, isAbsent: absent, enteredByTeacherId: a.teacher.id },
      create: {
        collegeId: a.collegeId, examId, studentId: r.studentId,
        obtainedMarks: value, isAbsent: absent, enteredByTeacherId: a.teacher.id,
      },
    }));
  }

  await prisma.$transaction(ops);
  res.json({ success: true, data: { saved: body.records.length } });
};

export const submitMarks = async (req, res) => {
  const { examId, sectionId } = req.params;
  const a = await authorizeMarks(req, res, examId, sectionId);
  if (!a) return;
  if (!a.teacher) return fail(res, 403, 'Only the assigned teacher can submit marks');

  const st = await prisma.examSectionStatus.findUnique({ where: { examId_sectionId: { examId, sectionId } } });
  if (st && st.status !== 'DRAFT') return fail(res, 409, 'These marks have already been submitted');

  const students = await prisma.student.findMany({
    where: { collegeId: a.collegeId, sectionId, deletedAt: null },
    select: { id: true },
  });
  const marks = await prisma.mark.findMany({
    where: { examId, studentId: { in: students.map((s) => s.id) } },
    select: { obtainedMarks: true, isAbsent: true },
  });
  const entered = marks.filter((m) => m.obtainedMarks !== null || m.isAbsent).length;
  if (students.length === 0) return fail(res, 400, 'There are no students in this section');
  if (entered < students.length) {
    return fail(res, 400, `${students.length - entered} student(s) have no mark. Enter a mark or mark them absent.`);
  }

  await prisma.examSectionStatus.upsert({
    where: { examId_sectionId: { examId, sectionId } },
    update: { status: 'SENT_TO_ADMIN', submittedAt: new Date(), submittedById: a.teacher.id, adminRemark: null },
    create: {
      collegeId: a.collegeId, examId, sectionId, status: 'SENT_TO_ADMIN',
      submittedAt: new Date(), submittedById: a.teacher.id,
    },
  });

  try {
    await notify({
      collegeId: a.collegeId,
      target: { role: 'admin' },
      type: 'info',
      title: 'Marks Submitted',
      message: `${a.exam.examTypeRef?.name || a.exam.type} marks for ${a.exam.subjectRef?.name} (${a.section.name}) are ready for review.`,
      link: '/admin/exams',
    });
  } catch (err) {
    logger.error(`[ExamCenter] submit notify error: ${err.message}`);
  }

  res.json({ success: true, data: { status: 'SENT_TO_ADMIN' } });
};