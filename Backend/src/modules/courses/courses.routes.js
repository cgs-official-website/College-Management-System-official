import express from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { prisma } from '../../server.js';
import { z } from 'zod';

const router = express.Router();

const adminOnly = authorize('admin', 'superadmin');
const staffOnly = authorize('admin', 'superadmin', 'teacher', 'hod', 'faculty');
const coursesReadAccess = authorize('admin', 'superadmin', 'teacher', 'hod', 'faculty', 'staff', 'student', 'parent');

const courseSchema = z.object({
  name: z.string().min(2, "Course/Program name must be at least 2 characters"),
  code: z.string().min(2, "Code must be at least 2 characters"),
  semester: z.number().int().min(1, "Total semesters/years must be at least 1"),
  credits: z.number().int().min(0).default(0),
  departmentId: z.string().uuid(),
  customFields: z.record(z.any()).nullish(),
});

router.use(authenticate);

router.use((req, res, next) => {
  if (!req.tenant || !req.tenant.collegeId) {
    return res.status(403).json({ error: 'Tenant context missing' });
  }
  next();
});

router.get('/my-classes', staffOnly, async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const { userId } = req.user;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { teacherProfile: true }
    });

    if (!user || !user.teacherProfile) {
      return res.json({ data: [] });
    }

    // A class is typically a Section in this architecture. 
    const sections = await prisma.section.findMany({
      where: {
        collegeId,
        teachers: {
          some: { id: user.teacherProfile.id }
        }
      },
      include: {
        course: { include: { department: true } },
        students: { select: { id: true } }
      }
    });

    const classes = sections.map(sec => ({
      id: sec.id,
      courseId: sec.course?.id,
      name: `${sec.course?.name || 'Subject'} - ${sec.name || 'Section'}`,
      subject: sec.course?.name || 'Subject',
      code: sec.course?.code || 'CODE',
      department: sec.course?.department?.name || 'General',
      credits: sec.course?.credits || 0,
      semester: sec.course?.semester || 1,
      students: sec.students.length || 0,
      timing: 'TBA', // Or fetch from timetable
      room: 'TBA',
      attendance: 85, // Mock attendance
      performance: 78 // Mock performance
    }));

    res.json({ data: classes });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.get('/', coursesReadAccess, async (req, res) => {
  try {
    const { departmentId } = req.query;
    
    const where = { collegeId: req.tenant.collegeId };
    if (departmentId) where.departmentId = departmentId;
    
    const courses = await prisma.course.findMany({
      where,
      include: { department: { select: { id: true, name: true, code: true } } },
      orderBy: { name: 'asc' }
    });
    res.json({ data: courses });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.post('/', adminOnly, async (req, res) => {
  try {
    const data = courseSchema.parse(req.body);
    
    // Verify department exists and belongs to this college
    const department = await prisma.department.findFirst({
      where: { id: data.departmentId, collegeId: req.tenant.collegeId }
    });
    if (!department) return res.status(404).json({ error: { message: 'Department not found' } });
    
    const existing = await prisma.course.findFirst({
      where: { collegeId: req.tenant.collegeId, code: data.code }
    });
    if (existing) return res.status(400).json({ error: { message: 'Course code already exists' } });

    const course = await prisma.course.create({
      data: {
        name: data.name,
        code: data.code,
        semester: data.semester,
        credits: data.credits,
        departmentId: data.departmentId,
        collegeId: req.tenant.collegeId,
        customFields: data.customFields || {}
      }
    });
    res.status(201).json({ data: course });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
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

    const departments = await prisma.department.findMany({ where: { collegeId }, select: { id: true, name: true, code: true } });
    const deptLookup = new Map();
    for (const d of departments) {
      deptLookup.set(d.name.toLowerCase(), d.id);
      deptLookup.set(d.code.toLowerCase(), d.id);
    }

    const seenCodes = new Set();

    for (const [index, row] of data.entries()) {
      const rowNo = index + 2;
      const fail = (msg) => { results.failed++; results.errors.push(`Row ${rowNo}: ${msg}`); };

      try {
        if (!Object.values(row || {}).some((v) => String(v ?? '').trim() !== '')) continue;

        const name = cell(row, 'Program_Name', 'Course_Name');
        const code = cell(row, 'Program_Code', 'Course_Code');
        const semRaw = cell(row, 'Total_Semesters', 'Semesters', 'Semester');
        const deptRaw = cell(row, 'Department', 'Department_Name', 'Department_Code');

        const missing = [];
        if (!name) missing.push('Program_Name');
        if (!code) missing.push('Program_Code');
        if (!semRaw) missing.push('Total_Semesters');
        if (!deptRaw) missing.push('Department');
        if (missing.length) return fail(`Missing required: ${missing.join(', ')}`);

        if (name.length < 2) return fail('Program_Name must be at least 2 characters');
        if (code.length < 2) return fail('Program_Code must be at least 2 characters');

        const semester = Number(semRaw);
        if (!Number.isInteger(semester) || semester < 1) {
          return fail(`Total_Semesters must be a whole number of 1 or more (got "${semRaw}")`);
        }

        const codeKey = code.toLowerCase();
        if (seenCodes.has(codeKey)) return fail(`Program_Code ${code} appears twice in the file`);
        seenCodes.add(codeKey);

        const departmentId = deptLookup.get(deptRaw.toLowerCase());
        if (!departmentId) return fail(`Department "${deptRaw}" not found. Create it first or fix the spelling`);

        const existing = await prisma.course.findFirst({
          where: { collegeId, code: { equals: code, mode: 'insensitive' } },
        });

        if (existing) {
          await prisma.course.update({
            where: { id: existing.id },
            data: { name, semester, departmentId },
          });
        } else {
          await prisma.course.create({
            data: { name, code, semester, credits: 0, departmentId, collegeId },
          });
        }
        results.successful++;
      } catch (err) {
        fail(err.message);
      }
    }

    return res.json({ data: results });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.put('/:id', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const data = courseSchema.parse(req.body);
    const existing = await prisma.course.findFirst({
      where: { id, collegeId: req.tenant.collegeId }
    });
    if (!existing) return res.status(404).json({ error: { message: 'Course not found' } });
    
    // Check if new department belongs to college
    if (data.departmentId !== existing.departmentId) {
      const newDept = await prisma.department.findFirst({
        where: { id: data.departmentId, collegeId: req.tenant.collegeId }
      });
      if (!newDept) return res.status(404).json({ error: { message: 'New department not found' } });
    }

    const existingCustom = (typeof existing.customFields === 'object' && existing.customFields !== null && !Array.isArray(existing.customFields)) ? existing.customFields : {};

    const course = await prisma.course.update({
      where: { id },
      data: {
        name: data.name,
        code: data.code,
        semester: data.semester,
        credits: data.credits,
        departmentId: data.departmentId,
        customFields: { ...existingCustom, ...(data.customFields || {}) }
      }
    });
    res.json({ data: course });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
});

router.delete('/:id', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.course.findFirst({
      where: { id, collegeId: req.tenant.collegeId }
    });
    if (!existing) return res.status(404).json({ error: { message: 'Course not found' } });
    await prisma.course.delete({ where: { id } });
    res.json({ data: { success: true } });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
});

export default router;
