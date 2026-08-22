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
        course: true,
        students: { select: { id: true } }
      }
    });

    const classes = sections.map(sec => ({
      id: sec.id,
      name: `${sec.course?.name || 'Subject'} - ${sec.name || 'Section'}`,
      subject: sec.course?.name || 'Subject',
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
