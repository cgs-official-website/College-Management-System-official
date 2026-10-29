import express from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { prisma } from '../../server.js';
import { z } from 'zod';

const router = express.Router();

const adminOnly = authorize('admin', 'superadmin');
const readAccess = authorize('admin', 'superadmin', 'teacher', 'hod', 'faculty', 'staff');

const saveSchema = z.object({
  subjectId: z.string().uuid(),
  sectionId: z.string().uuid(),
  teacherId: z.string().uuid(),
});

router.use(authenticate);
router.use((req, res, next) => {
  if (!req.tenant || !req.tenant.collegeId) {
    return res.status(403).json({ error: 'Tenant context missing' });
  }
  next();
});

const teacherSelect = {
  id: true,
  user: { select: { id: true, name: true, email: true } },
};

router.get('/matrix', readAccess, async (req, res) => {
  try {
    const collegeId = req.tenant.collegeId;
    const { sectionId } = req.query;
    const semester = parseInt(req.query.semester, 10);

    if (!sectionId || !Number.isInteger(semester)) {
      return res.status(400).json({ error: { message: 'sectionId and semester are required' } });
    }

    const section = await prisma.section.findFirst({
      where: { id: sectionId, collegeId },
      include: { course: { select: { id: true, name: true, code: true, semester: true } } },
    });
    if (!section) return res.status(404).json({ error: { message: 'Section not found' } });

    if (semester < 1 || semester > section.course.semester) {
      return res.status(400).json({ error: { message: `Semester must be between 1 and ${section.course.semester}` } });
    }

    const subjects = await prisma.subject.findMany({
      where: { collegeId, courseId: section.courseId, semester, isActive: true },
      orderBy: { code: 'asc' },
    });

    const assignments = await prisma.teachingAssignment.findMany({
      where: { collegeId, sectionId, subjectId: { in: subjects.map((s) => s.id) } },
      include: { teacher: { select: teacherSelect } },
    });
    const bySubject = new Map(assignments.map((a) => [a.subjectId, a]));

    const rows = subjects.map((s) => {
      const a = bySubject.get(s.id);
      return {
        subject: { id: s.id, code: s.code, name: s.name, type: s.type, credits: s.credits },
        assignment: a ? { id: a.id, teacherId: a.teacherId, teacher: a.teacher } : null,
      };
    });

    res.json({
      data: {
        section: { id: section.id, name: section.name, course: section.course },
        semester,
        rows,
      },
    });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// Classes the logged-in teacher teaches (used later by marks entry and attendance)
router.get('/my', readAccess, async (req, res) => {
  try {
    const collegeId = req.tenant.collegeId;
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { teacherProfile: true },
    });
    if (!user?.teacherProfile) return res.json({ data: [] });

    const items = await prisma.teachingAssignment.findMany({
      where: { collegeId, teacherId: user.teacherProfile.id },
      include: {
        subject: { select: { id: true, code: true, name: true, type: true, semester: true, courseId: true } },
        section: { select: { id: true, name: true, course: { select: { id: true, name: true } } } },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
    res.json({ data: items });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// Assign (or replace) the teacher for a subject in a section
router.put('/', adminOnly, async (req, res) => {
  try {
    const collegeId = req.tenant.collegeId;
    const data = saveSchema.parse(req.body);

    const [subject, section, teacher] = await Promise.all([
      prisma.subject.findFirst({ where: { id: data.subjectId, collegeId } }),
      prisma.section.findFirst({ where: { id: data.sectionId, collegeId } }),
      prisma.teacher.findFirst({ where: { id: data.teacherId, collegeId, deletedAt: null } }),
    ]);

    if (!subject) return res.status(404).json({ error: { message: 'Subject not found' } });
    if (!section) return res.status(404).json({ error: { message: 'Section not found' } });
    if (!teacher) return res.status(404).json({ error: { message: 'Teacher not found' } });
    if (subject.courseId !== section.courseId) {
      return res.status(400).json({ error: { message: 'This subject belongs to a different program than the section' } });
    }

    const assignment = await prisma.teachingAssignment.upsert({
      where: {
        subjectId_sectionId: { subjectId: data.subjectId, sectionId: data.sectionId },
      },
      update: { teacherId: data.teacherId },
      create: { collegeId, ...data },
      include: { teacher: { select: teacherSelect } },
    });

    try {
      await prisma.auditLog.create({
        data: {
          collegeId, userId: req.user?.userId, userRole: req.user?.role,
          action: 'ASSIGN_TEACHER', module: 'academic', entity: 'TeachingAssignment', entityId: assignment.id,
          description: `${subject.code} / ${section.name}`,
          newValue: data,
        },
      });
    } catch { /* audit failure must not block the action */ }

    res.json({ data: assignment });
  } catch (error) {
    res.status(400).json({ error: { message: error.issues?.[0]?.message || error.message } });
  }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const collegeId = req.tenant.collegeId;
    const existing = await prisma.teachingAssignment.findFirst({ where: { id, collegeId } });
    if (!existing) return res.status(404).json({ error: { message: 'Assignment not found' } });

    await prisma.teachingAssignment.delete({ where: { id } });

    try {
      await prisma.auditLog.create({
        data: {
          collegeId, userId: req.user?.userId, userRole: req.user?.role,
          action: 'UNASSIGN_TEACHER', module: 'academic', entity: 'TeachingAssignment', entityId: id,
          oldValue: existing,
        },
      });
    } catch { /* ignore */ }

    res.json({ data: { success: true } });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
});

export default router;