import express from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { prisma } from '../../server.js';
import { z } from 'zod';

const router = express.Router();

const sectionSchema = z.object({
  name: z.string().min(1, "Section/Class name must not be empty"),
  capacity: z.number().int().min(1, "Capacity must be at least 1"),
  courseId: z.string().uuid(),
  teacherIds: z.array(z.string().uuid()).optional()
});

router.use(authenticate);

router.use((req, res, next) => {
  if (!req.tenant || !req.tenant.collegeId) {
    return res.status(403).json({ error: 'Tenant context missing' });
  }
  next();
});

router.get('/', async (req, res) => {
  try {
    const { courseId } = req.query;
    const where = { collegeId: req.tenant.collegeId };
    if (courseId) where.courseId = courseId;
    
    const sections = await prisma.section.findMany({
      where,
      include: { 
        course: { select: { id: true, name: true, code: true, departmentId: true } },
        teachers: { select: { id: true, user: { select: { id: true, name: true, email: true } } } }
      },
      orderBy: { name: 'asc' }
    });
    res.json({ data: sections });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = sectionSchema.parse(req.body);
    
    const course = await prisma.course.findFirst({
      where: { id: data.courseId, collegeId: req.tenant.collegeId }
    });
    if (!course) return res.status(404).json({ error: { message: 'Course not found' } });
    
    const existing = await prisma.section.findFirst({
      where: { collegeId: req.tenant.collegeId, courseId: data.courseId, name: data.name }
    });
    if (existing) return res.status(400).json({ error: { message: 'Section name already exists in this course' } });

    const section = await prisma.section.create({
      data: {
        name: data.name,
        capacity: data.capacity,
        courseId: data.courseId,
        collegeId: req.tenant.collegeId,
        ...(data.teacherIds && data.teacherIds.length > 0 ? {
          teachers: {
            connect: data.teacherIds.map(id => ({ id }))
          }
        } : {})
      },
      include: {
        teachers: { select: { id: true, user: { select: { id: true, name: true, email: true } } } }
      }
    });
    res.status(201).json({ data: section });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = sectionSchema.parse(req.body);
    
    const existing = await prisma.section.findFirst({
      where: { id, collegeId: req.tenant.collegeId }
    });
    if (!existing) return res.status(404).json({ error: { message: 'Section not found' } });
    
    if (data.courseId !== existing.courseId) {
      const newCourse = await prisma.course.findFirst({
        where: { id: data.courseId, collegeId: req.tenant.collegeId }
      });
      if (!newCourse) return res.status(404).json({ error: { message: 'New course not found' } });
    }

    const section = await prisma.section.update({
      where: { id },
      data: {
        name: data.name,
        capacity: data.capacity,
        courseId: data.courseId,
        ...(data.teacherIds ? {
          teachers: {
            set: data.teacherIds.map(id => ({ id }))
          }
        } : {})
      },
      include: {
        teachers: { select: { id: true, user: { select: { id: true, name: true, email: true } } } }
      }
    });
    res.json({ data: section });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.section.findFirst({
      where: { id, collegeId: req.tenant.collegeId }
    });
    if (!existing) return res.status(404).json({ error: { message: 'Section not found' } });
    await prisma.section.delete({ where: { id } });
    res.json({ data: { success: true } });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
});

export default router;
