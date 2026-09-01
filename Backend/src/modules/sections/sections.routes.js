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
        const name = (row['Section_Name'] || row['Section_Name*'])?.toString().trim();
        const capacity = parseInt(row['Capacity'] || row['Capacity*'], 10) || 30;
        const courseCode = (row['Course_Code'] || row['Course_Code*'])?.toString().trim();

        if (!name || !courseCode) {
          failed++;
          continue;
        }

        // Find course
        let course = await prisma.course.findFirst({
          where: { collegeId, code: courseCode }
        });

        if (!course) {
          // If course is missing, we could try to create a generic course and department
          // But it's better if they exist. We'll stub it out for robustness.
          let department = await prisma.department.findFirst({
            where: { collegeId }
          });
          
          if (!department) {
            department = await prisma.department.create({
              data: { name: 'General', code: 'GEN', collegeId }
            });
          }

          course = await prisma.course.create({
            data: {
              name: courseCode,
              code: courseCode,
              semester: 1,
              credits: 0,
              departmentId: department.id,
              collegeId
            }
          });
        }

        const existing = await prisma.section.findFirst({
          where: { collegeId, courseId: course.id, name }
        });

        if (existing) {
          await prisma.section.update({
            where: { id: existing.id },
            data: { capacity }
          });
        } else {
          await prisma.section.create({
            data: { name, capacity, courseId: course.id, collegeId }
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
