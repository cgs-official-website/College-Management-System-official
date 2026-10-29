import express from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { prisma } from '../../server.js';
import { z } from 'zod';
import { authorize } from '../../middleware/authorize.js';

const router = express.Router();

const adminOnly = authorize('admin', 'superadmin');

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
    const collegeId = req.tenant.collegeId;
    const where = { collegeId };
    if (courseId) where.courseId = courseId;

    const sections = await prisma.section.findMany({
      where,
      include: {
        course: { select: { id: true, name: true, code: true, departmentId: true, semester: true } },
        teachers: { select: { id: true, user: { select: { id: true, name: true, email: true } } } }
      },
      orderBy: { name: 'asc' }
    });

    const grouped = await prisma.student.groupBy({
      by: ['sectionId', 'currentSemester'],
      where: { collegeId, deletedAt: null, sectionId: { in: sections.map(s => s.id) } },
      _count: { _all: true }
    });

    const countsBySection = new Map();
    for (const g of grouped) {
      const list = countsBySection.get(g.sectionId) || [];
      list.push({ semester: g.currentSemester, count: g._count._all });
      countsBySection.set(g.sectionId, list);
    }

    const data = sections.map(s => ({
      ...s,
      semesterCounts: (countsBySection.get(s.id) || []).sort((a, b) => (a.semester ?? 99) - (b.semester ?? 99))
    }));

    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
});

router.post('/', adminOnly, async (req, res) => {
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

router.post('/bulk', adminOnly, async (req, res) => {
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

router.put('/:id', adminOnly, async (req, res) => {  try {
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

router.delete('/:id', adminOnly, async (req, res) => {  try {
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

router.post('/:id/semester', adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const collegeId = req.tenant.collegeId;
    const body = z.object({
      action: z.enum(['promote', 'set']),
      semester: z.number().int().min(1).optional(),
      onlyEmpty: z.boolean().optional()  
    }).parse(req.body);

    const section = await prisma.section.findFirst({
      where: { id, collegeId },
      include: { course: { select: { id: true, name: true, semester: true } } }
    });
    if (!section) return res.status(404).json({ error: { message: 'Section not found' } });

    const total = section.course.semester;
    const base = { collegeId, sectionId: id, deletedAt: null };
    let result;

    if (body.action === 'promote') {
      const [atFinal, notSet] = await Promise.all([
        prisma.student.count({ where: { ...base, currentSemester: { gte: total } } }),
        prisma.student.count({ where: { ...base, currentSemester: null } })
      ]);
      const updated = await prisma.student.updateMany({
        where: { ...base, currentSemester: { gte: 1, lt: total } },
        data: { currentSemester: { increment: 1 } }
      });
      result = { updated: updated.count, skippedAtFinalSemester: atFinal, skippedNotSet: notSet };
    } else {
      if (!body.semester) return res.status(400).json({ error: { message: 'Semester is required' } });
      if (body.semester > total) {
        return res.status(400).json({ error: { message: `Semester must be between 1 and ${total} for ${section.course.name}` } });
      }
      const where = body.onlyEmpty ? { ...base, currentSemester: null } : base;
      const updated = await prisma.student.updateMany({ where, data: { currentSemester: body.semester } });
      result = { updated: updated.count };
    }

    try {
      await prisma.auditLog.create({
        data: {
          collegeId, userId: req.user?.userId, userRole: req.user?.role,
          action: body.action === 'promote' ? 'PROMOTE_SECTION' : 'SET_SEMESTER',
          module: 'academic', entity: 'Section', entityId: id,
          description: `${section.course.name} / ${section.name}`,
          newValue: { ...body, ...result }
        }
      });
    } catch { /* audit failure must not block the action */ }

    res.json({ data: result });
  } catch (error) {
    res.status(400).json({ error: { message: error.issues?.[0]?.message || error.message } });
  }
});

export default router;
