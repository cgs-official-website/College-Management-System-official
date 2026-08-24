import express from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { prisma } from '../../server.js';
import { z } from 'zod';

const router = express.Router();

const courseSchema = z.object({
  name: z.string().min(2, "Course/Program name must be at least 2 characters"),
  code: z.string().min(2, "Code must be at least 2 characters"),
  semester: z.number().int().min(1, "Total semesters/years must be at least 1"),
  credits: z.number().int().min(0).default(0),
  departmentId: z.string().uuid()
});

router.use(authenticate);

router.use((req, res, next) => {
  if (!req.tenant || !req.tenant.collegeId) {
    return res.status(403).json({ error: 'Tenant context missing' });
  }
  next();
});

router.get('/my-classes', async (req, res) => {
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

router.get('/', async (req, res) => {
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

router.post('/', async (req, res) => {
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
        collegeId: req.tenant.collegeId
      }
    });
    res.status(201).json({ data: course });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
});

router.post('/bulk', async (req, res) => {
  try {
    const { data } = req.body;
    if (!Array.isArray(data)) {
      return res.status(400).json({ error: { message: 'Data must be an array' } });
    }

    const collegeId = req.tenant.collegeId;
    let successful = 0;
    let failed = 0;

    for (const row of data) {
      try {
        const name = row['Course_Name']?.toString().trim();
        const code = row['Course_Code']?.toString().trim();
        const semester = parseInt(row['Semester']) || 1;
        const credits = parseInt(row['Credits']) || 0;
        const departmentCode = row['Department_Code']?.toString().trim();

        if (!name || !code || !departmentCode) {
          failed++;
          continue;
        }

        // Find or create department
        let department = await prisma.department.findFirst({
          where: { collegeId, code: departmentCode }
        });

        if (!department) {
          department = await prisma.department.create({
            data: {
              name: departmentCode, // use code as name temporarily if not present
              code: departmentCode,
              collegeId
            }
          });
        }

        const existing = await prisma.course.findFirst({
          where: { collegeId, code }
        });

        if (existing) {
          await prisma.course.update({
            where: { id: existing.id },
            data: { name, semester, credits, departmentId: department.id }
          });
        } else {
          await prisma.course.create({
            data: { name, code, semester, credits, departmentId: department.id, collegeId }
          });
        }
        successful++;
      } catch (err) {
        failed++;
      }
    }
    
    return res.json({ data: { successful, failed } });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.put('/:id', async (req, res) => {
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

    const course = await prisma.course.update({
      where: { id },
      data: {
        name: data.name,
        code: data.code,
        semester: data.semester,
        credits: data.credits,
        departmentId: data.departmentId
      }
    });
    res.json({ data: course });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
});

router.delete('/:id', async (req, res) => {
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
