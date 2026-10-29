import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { notify } from '../notifications/notify.service.js';
import { z } from 'zod';
import { isPastDeadline } from '../../lib/assignmentDeadline.js';

const createAssignmentSchema = z.object({
  sectionId: z.string().uuid(),
  subjectId: z.string().uuid(),
  title: z.string().min(2),
  description: z.string().min(1),
  dueDate: z.string(),
  maxScore: z.number().positive().max(1000).optional(),
});

const fail = (res, status, code, message) =>
  res.status(status).json({ success: false, error: { code, message } });

const forbidden = (res) =>
  fail(res, 403, 'FORBIDDEN', 'Only admins and assigned teachers can manage assignments');

const isAdminRole = (role) => role === 'admin' || role === 'superadmin';

async function getActor(req) {
  if (isAdminRole(req.user?.role)) return { admin: true, teacher: null };
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const userId = req.user?.userId || req.user?.id;
  const teacher = await prisma.teacher.findFirst({
    where: { collegeId, userId, deletedAt: null },
    select: { id: true },
  });
  return { admin: false, teacher };
}

async function getSectionSemesters(collegeId, sectionIds) {
  if (!sectionIds.length) return new Map();
  const rows = await prisma.student.groupBy({
    by: ['sectionId', 'currentSemester'],
    where: {
      collegeId,
      sectionId: { in: sectionIds },
      deletedAt: null,
      currentSemester: { not: null },
    },
    _count: { _all: true },
  });
  const best = new Map();
  for (const r of rows) {
    const cur = best.get(r.sectionId);
    if (!cur || r._count._all > cur.count) {
      best.set(r.sectionId, { semester: r.currentSemester, count: r._count._all });
    }
  }
  return new Map([...best].map(([id, v]) => [id, v.semester]));
}

export const getAssignmentOptions = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actor = await getActor(req);
  if (!actor.admin && !actor.teacher) return forbidden(res);
  const { teacher } = actor;

  let sections = [];
  let subjectsFor;

  if (teacher) {
    const tas = await prisma.teachingAssignment.findMany({
      where: { collegeId, teacherId: teacher.id },
      include: { subject: true, section: { include: { course: true } } },
    });
    const byId = new Map();
    for (const ta of tas) byId.set(ta.section.id, ta.section);
    sections = [...byId.values()];
    subjectsFor = (section, semester) =>
      tas
        .filter((t) => t.sectionId === section.id && t.subject.isActive && t.subject.semester === semester)
        .map((t) => t.subject);
  } else {
    sections = await prisma.section.findMany({
      where: { collegeId },
      include: { course: true },
      orderBy: { name: 'asc' },
    });
    const courseIds = [...new Set(sections.map((s) => s.courseId))];
    const subjects = await prisma.subject.findMany({
      where: { collegeId, courseId: { in: courseIds }, isActive: true },
      orderBy: { code: 'asc' },
    });
    subjectsFor = (section, semester) =>
      subjects.filter((s) => s.courseId === section.courseId && s.semester === semester);
  }

  sections = sections.filter((s) => s.course && !s.course.deletedAt);
  const semesters = await getSectionSemesters(collegeId, sections.map((s) => s.id));

  const courses = new Map();
  for (const s of sections) {
    if (!courses.has(s.courseId)) {
      courses.set(s.courseId, { id: s.courseId, name: s.course.name, code: s.course.code, sections: [] });
    }
    const semester = semesters.get(s.id) ?? null;
    courses.get(s.courseId).sections.push({
      id: s.id,
      name: s.name,
      semester,
      subjects:
        semester === null
          ? []
          : subjectsFor(s, semester).map((x) => ({ id: x.id, code: x.code, name: x.name })),
    });
  }

  const data = [...courses.values()].sort((a, b) => a.name.localeCompare(b.name));
  res.json({ success: true, data });
};

export const getAssignments = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actor = await getActor(req);
  if (!actor.admin && !actor.teacher) return forbidden(res);
  const { teacher } = actor;

  const where = { collegeId };
  if (teacher) where.teacherId = teacher.id;

  const assignments = await prisma.assignment.findMany({
    where,
    include: {
      course: true,
      section: true,
      subject: true,
      teacher: { include: { user: { select: { name: true, email: true } } } },
      _count: { select: { submissions: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

    const gradedRows = assignments.length
    ? await prisma.assignmentSubmission.groupBy({
        by: ['assignmentId'],
        where: { assignmentId: { in: assignments.map((a) => a.id) }, score: { not: null } },
        _count: { _all: true },
      })
    : [];
  const gradedMap = new Map(gradedRows.map((r) => [r.assignmentId, r._count._all]));


  const formatted = assignments.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    dueDate: a.dueDate,
    createdAt: a.createdAt,
    courseId: a.courseId,
    sectionId: a.sectionId,
    subjectId: a.subjectId,
    subject: a.subject?.name || a.course?.name || 'Subject',
    subjectCode: a.subject?.code || null,
    semester: a.subject?.semester ?? null,
    courseName: a.course?.name || 'Course',
    sectionName: a.section?.name || null,
    class: a.course?.name || 'Class',
    maxScore: a.maxScore,
    teacherName: a.teacher?.user?.name || 'Faculty',
    submissionsCount: a._count?.submissions || 0,
    gradedCount: gradedMap.get(a.id) || 0,
    status: isPastDeadline(a.dueDate) ? 'closed' : 'active',
  }));

  res.json({ data: formatted });
};

export const createAssignment = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actor = await getActor(req);
  if (!actor.admin && !actor.teacher) return forbidden(res);
  const { teacher } = actor;
  const data = createAssignmentSchema.parse(req.body);

  const due = new Date(data.dueDate);
  if (isNaN(due.getTime())) return fail(res, 400, 'INVALID_DATE', 'Due date is not valid');
  if (isPastDeadline(due)) return fail(res, 422, 'DUE_DATE_PAST', 'Due date cannot be in the past');

  const [section, subject] = await Promise.all([
    prisma.section.findFirst({ where: { id: data.sectionId, collegeId } }),
    prisma.subject.findFirst({ where: { id: data.subjectId, collegeId, isActive: true } }),
  ]);
  if (!section) return fail(res, 404, 'SECTION_NOT_FOUND', 'Section not found');
  if (!subject) return fail(res, 404, 'SUBJECT_NOT_FOUND', 'Subject not found or inactive');
  if (subject.courseId !== section.courseId) {
    return fail(res, 422, 'SUBJECT_COURSE_MISMATCH', 'This subject does not belong to the section\'s course');
  }

  const semesters = await getSectionSemesters(collegeId, [section.id]);
  const semester = semesters.get(section.id);
  if (semester === undefined || subject.semester !== semester) {
    return fail(
      res, 422, 'SUBJECT_NOT_IN_SEMESTER',
      semester === undefined
        ? 'This section has no students with a current semester set.'
        : `Only Semester ${semester} subjects can be chosen for this section.`
    );
  }

  const ta = await prisma.teachingAssignment.findUnique({
    where: { subjectId_sectionId: { subjectId: subject.id, sectionId: section.id } },
  });

  let teacherId;
  if (teacher) {
    if (!ta || ta.teacherId !== teacher.id) {
      return fail(res, 403, 'NOT_ASSIGNED', 'This subject is not assigned to you for this section');
    }
    teacherId = teacher.id;
  } else {
    if (!ta) {
      return fail(res, 400, 'NO_TEACHER_ASSIGNED', 'No teacher is assigned to this subject in this section. Assign one in the Teaching tab first.');
    }
    teacherId = ta.teacherId;
  }

  const assignment = await prisma.assignment.create({
    data: {
      title: data.title,
      description: data.description,
      dueDate: due,
      courseId: section.courseId,
      sectionId: section.id,
      subjectId: subject.id,
      maxScore: data.maxScore ?? 100,
      teacherId,
      collegeId,
    },
  });

  try {
    const students = await prisma.student.findMany({
      where: { collegeId, sectionId: section.id, deletedAt: null },
      select: { userId: true },
    });
    const recipientUserIds = [...new Set(students.map((s) => s.userId).filter(Boolean))];
    if (recipientUserIds.length > 0) {
      await notify({
        collegeId,
        target: { userIds: recipientUserIds },
        title: 'New Assignment Posted',
        message: `New assignment '${data.title}' for ${subject.name}. Due date: ${due.toISOString().slice(0, 10)}.`,
        type: 'assignment_new',
        link: '/student/assignments',
      });
      logger?.info?.(`[Assignments] Notified ${recipientUserIds.length} students for assignment ${assignment.id}`);
    }
  } catch (notifErr) {
    logger?.error?.(`[Assignments] Notification error: ${notifErr.message}`);
  }

  res.status(201).json({ success: true, data: assignment });
};

export const deleteAssignment = async (req, res) => {
  const { id } = req.params;
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actor = await getActor(req);
  if (!actor.admin && !actor.teacher) return forbidden(res);
  const { teacher } = actor;

  await prisma.assignment.deleteMany({
    where: { id, collegeId, ...(teacher ? { teacherId: teacher.id } : {}) },
  });

  res.json({ success: true });
};

export const getAssignmentSubmissions = async (req, res) => {
  const { id } = req.params;
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actor = await getActor(req);
  if (!actor.admin && !actor.teacher) return forbidden(res);
  const { teacher } = actor;

  const assignment = await prisma.assignment.findFirst({
    where: { id, collegeId, ...(teacher ? { teacherId: teacher.id } : {}) },
    select: { id: true },
  });
  if (!assignment) return fail(res, 404, 'ASSIGNMENT_NOT_FOUND', 'Assignment not found');

  const submissions = await prisma.assignmentSubmission.findMany({
    where: { assignmentId: id, collegeId },
    include: {
      student: {
        include: {
          user: { select: { name: true, email: true } },
          department: { select: { name: true } },
        },
      },
    },
    orderBy: { submittedAt: 'desc' },
  });

  const formatted = submissions.map((s) => ({
    id: s.id,
    studentName: s.student?.user?.name || 'Student',
    admissionNumber: s.student?.admissionNumber || 'N/A',
    department: s.student?.department?.name || 'Academic',
    fileUrl: s.fileUrl,
    submittedAt: s.submittedAt,
    status: s.status,
    score: s.score,
    feedback: s.feedback,
  }));

  res.json({ data: formatted });
};

const gradeSchema = z.object({
  score: z.number().min(0).nullable(),
  feedback: z.string().trim().max(1000).nullable().optional(),
});

export const gradeSubmission = async (req, res) => {
  const { id, submissionId } = req.params;
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actor = await getActor(req);
  if (!actor.admin && !actor.teacher) return forbidden(res);
  const { teacher } = actor;
  const body = gradeSchema.parse(req.body);

  const assignment = await prisma.assignment.findFirst({
    where: { id, collegeId, ...(teacher ? { teacherId: teacher.id } : {}) },
  });
  if (!assignment) return fail(res, 404, 'ASSIGNMENT_NOT_FOUND', 'Assignment not found');

  const submission = await prisma.assignmentSubmission.findFirst({
    where: { id: submissionId, assignmentId: id, collegeId },
    include: { student: { select: { userId: true } } },
  });
  if (!submission) return fail(res, 404, 'SUBMISSION_NOT_FOUND', 'Submission not found');

  const graded = body.score !== null;
  if (graded && body.score > assignment.maxScore) {
    return fail(res, 422, 'SCORE_TOO_HIGH', `Score cannot be more than ${assignment.maxScore}`);
  }

  const updated = await prisma.assignmentSubmission.update({
    where: { id: submissionId },
    data: {
      score: body.score,
      feedback: graded ? (body.feedback?.trim() || null) : null,
      status: graded ? 'graded' : 'submitted',
    },
  });

  if (graded && submission.student?.userId) {
    try {
      await notify({
        collegeId,
        target: { userId: submission.student.userId },
        type: 'assignment_graded',
        title: 'Assignment Graded',
        message: `Your submission for '${assignment.title}' has been graded: ${body.score}/${assignment.maxScore}.`,
        link: '/student/assignments',
      });
    } catch (notifErr) {
      logger?.error?.(`[Assignments] Grade notification error: ${notifErr.message}`);
    }
  }

  res.json({ success: true, data: updated });
};