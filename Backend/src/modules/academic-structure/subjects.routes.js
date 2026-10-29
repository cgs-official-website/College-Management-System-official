import express from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { prisma } from '../../server.js';
import { z } from 'zod';

const router = express.Router();

const adminOnly = authorize('admin', 'superadmin');
const readAccess = authorize('admin', 'superadmin', 'teacher', 'hod', 'faculty', 'staff', 'student', 'parent');

const SUBJECT_TYPES = ['THEORY', 'LAB', 'PROJECT'];

const subjectSchema = z.object({
  courseId: z.string().uuid(),
  semester: z.number().int().min(1),
  code: z.string().trim().min(2, 'Subject code must be at least 2 characters'),
  name: z.string().trim().min(2, 'Subject name must be at least 2 characters'),
  credits: z.number().int().min(0).default(0),
  type: z.enum(SUBJECT_TYPES).default('THEORY'),
  isActive: z.boolean().default(true),
});

router.use(authenticate);
router.use((req, res, next) => {
  if (!req.tenant || !req.tenant.collegeId) {
    return res.status(403).json({ error: 'Tenant context missing' });
  }
  next();
});

// The Course (= program) must belong to this college and the semester must be in range
async function validateCourseAndSemester(collegeId, courseId, semester) {
  const course = await prisma.course.findFirst({ where: { id: courseId, collegeId } });
  if (!course) return { error: 'Program not found' };
  if (semester > course.semester) {
    return { error: `Semester must be between 1 and ${course.semester} for ${course.name}` };
  }
  return { course };
}

router.get('/', readAccess, async (req, res) => {
  try {
    const { courseId, semester, activeOnly } = req.query;
    const where = { collegeId: req.tenant.collegeId };
    if (courseId) where.courseId = courseId;
    if (semester) where.semester = parseInt(semester, 10);
    if (activeOnly === 'true') where.isActive = true;

    const subjects = await prisma.subject.findMany({
      where,
      include: { course: { select: { id: true, name: true, code: true, semester: true } } },
      orderBy: [{ semester: 'asc' }, { code: 'asc' }],
    });
    res.json({ data: subjects });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.post('/', adminOnly, async (req, res) => {
  try {
    const data = subjectSchema.parse(req.body);
    const collegeId = req.tenant.collegeId;

    const check = await validateCourseAndSemester(collegeId, data.courseId, data.semester);
    if (check.error) return res.status(400).json({ error: { message: check.error } });

    const existing = await prisma.subject.findFirst({
      where: { collegeId, courseId: data.courseId, code: { equals: data.code, mode: 'insensitive' } },
    });
    if (existing) {
      return res.status(400).json({ error: { message: `Subject code "${data.code}" already exists in this program` } });
    }

    const subject = await prisma.subject.create({ data: { ...data, collegeId } });
    res.status(201).json({ data: subject });
  } catch (error) {
    res.status(400).json({ error: { message: error.issues?.[0]?.message || error.message } });
  }
});

router.post('/bulk', adminOnly, async (req, res) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: { message: 'No data provided for import' } });
    }

    const collegeId = req.tenant.collegeId;
    const results = { successful: 0, failed: 0, errors: [] };
    const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
    const cell = (row, ...names) => {
      const keys = Object.keys(row || {});
      for (const n of names) {
        const key = keys.find((k) => norm(k) === norm(n));
        if (key !== undefined && row[key] !== null && row[key] !== undefined && String(row[key]).trim() !== '') {
          return String(row[key]).trim();
        }
      }
      return '';
    };

    const courses = await prisma.course.findMany({ where: { collegeId } });
    const courseLookup = new Map();
    for (const c of courses) {
      courseLookup.set(c.code.toLowerCase(), c);
      courseLookup.set(c.name.toLowerCase(), c);
    }

    const seen = new Set();

    for (const [index, row] of data.entries()) {
      const rowNo = index + 2;
      const fail = (msg) => { results.failed++; results.errors.push(`Row ${rowNo}: ${msg}`); };

      try {
        if (!Object.values(row || {}).some((v) => String(v ?? '').trim() !== '')) continue;

        const programRaw = cell(row, 'Program_Code', 'Program', 'Course_Code');
        const semRaw = cell(row, 'Semester');
        const code = cell(row, 'Subject_Code', 'Code');
        const name = cell(row, 'Subject_Name', 'Name');
        const creditsRaw = cell(row, 'Credits') || '0';
        const typeRaw = (cell(row, 'Type', 'Subject_Type') || 'THEORY').toUpperCase();

        const missing = [];
        if (!programRaw) missing.push('Program_Code');
        if (!semRaw) missing.push('Semester');
        if (!code) missing.push('Subject_Code');
        if (!name) missing.push('Subject_Name');
        if (missing.length) return fail(`Missing required: ${missing.join(', ')}`);

        const course = courseLookup.get(programRaw.toLowerCase());
        if (!course) return fail(`Program "${programRaw}" not found. Create it first or fix the spelling`);

        const semester = Number(semRaw);
        if (!Number.isInteger(semester) || semester < 1 || semester > course.semester) {
          return fail(`Semester must be 1 to ${course.semester} for ${course.code} (got "${semRaw}")`);
        }

        const credits = Number(creditsRaw);
        if (!Number.isInteger(credits) || credits < 0) return fail(`Credits must be a whole number (got "${creditsRaw}")`);

        if (!SUBJECT_TYPES.includes(typeRaw)) return fail(`Type must be THEORY, LAB or PROJECT (got "${typeRaw}")`);

        const key = `${course.id}:${code.toLowerCase()}`;
        if (seen.has(key)) return fail(`Subject_Code ${code} appears twice for ${course.code} in the file`);
        seen.add(key);

        const existing = await prisma.subject.findFirst({
          where: { collegeId, courseId: course.id, code: { equals: code, mode: 'insensitive' } },
        });

        if (existing) {
          await prisma.subject.update({
            where: { id: existing.id },
            data: { name, semester, credits, type: typeRaw },
          });
        } else {
          await prisma.subject.create({
            data: { collegeId, courseId: course.id, semester, code, name, credits, type: typeRaw },
          });
        }
        results.successful++;
      } catch (err) {
        fail(err.message);
      }
    }

    res.json({ data: results });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.put('/:id', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const data = subjectSchema.parse(req.body);
    const collegeId = req.tenant.collegeId;

    const existing = await prisma.subject.findFirst({ where: { id, collegeId } });
    if (!existing) return res.status(404).json({ error: { message: 'Subject not found' } });

    if (data.courseId !== existing.courseId) {
      const used = await prisma.teachingAssignment.count({ where: { subjectId: id } });
      if (used > 0) {
        return res.status(400).json({ error: { message: 'Cannot move a subject to another program while teachers are assigned to it' } });
      }
    }

    const check = await validateCourseAndSemester(collegeId, data.courseId, data.semester);
    if (check.error) return res.status(400).json({ error: { message: check.error } });

    const duplicate = await prisma.subject.findFirst({
      where: {
        collegeId, courseId: data.courseId, id: { not: id },
        code: { equals: data.code, mode: 'insensitive' },
      },
    });
    if (duplicate) {
      return res.status(400).json({ error: { message: `Subject code "${data.code}" is already used in this program` } });
    }

    const subject = await prisma.subject.update({ where: { id }, data });
    res.json({ data: subject });
  } catch (error) {
    res.status(400).json({ error: { message: error.issues?.[0]?.message || error.message } });
  }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.subject.findFirst({ where: { id, collegeId: req.tenant.collegeId } });
    if (!existing) return res.status(404).json({ error: { message: 'Subject not found' } });

    const [teaching, exams, attendance, timetable, assignments] = await Promise.all([
      prisma.teachingAssignment.count({ where: { subjectId: id } }),
      prisma.exam.count({ where: { subjectId: id } }),
      prisma.attendance.count({ where: { subjectId: id } }),
      prisma.timetableSlot.count({ where: { subjectId: id } }),
      prisma.assignment.count({ where: { subjectId: id } }),
    ]);

    if (teaching + exams + attendance + timetable + assignments > 0) {
      return res.status(400).json({
        error: { message: 'This subject is already in use (teachers, exams, attendance, timetable or assignments). Mark it inactive instead of deleting.' },
      });
    }

    await prisma.subject.delete({ where: { id } });
    res.json({ data: { success: true } });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
});

export default router;