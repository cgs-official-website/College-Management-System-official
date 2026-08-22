import { prisma } from '../../server.js';
import { z } from 'zod';

const createAssignmentSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(2),
  description: z.string(),
  dueDate: z.string(),
  maxScore: z.number().optional()
});

export const getAssignments = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const userId = req.user?.userId || req.user?.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { teacherProfile: true }
  });

  const where = { collegeId };
  if (user?.role === 'teacher' && user.teacherProfile) {
    where.teacherId = user.teacherProfile.id;
  }

  const assignments = await prisma.assignment.findMany({
    where,
    include: {
      course: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const formatted = assignments.map(a => ({
    id: a.id,
    title: a.title,
    description: a.description,
    dueDate: a.dueDate,
    createdAt: a.createdAt,
    courseId: a.courseId,
    subject: a.course?.name || 'Subject',
    class: a.course?.name || 'Class',
    submissionsCount: 0,
    gradedCount: 0,
    status: new Date(a.dueDate) > new Date() ? 'active' : 'closed'
  }));

  res.json({ data: formatted });
};

export const createAssignment = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const userId = req.user?.userId || req.user?.id;
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { teacherProfile: true }
  });

  if (!user?.teacherProfile) {
    return res.status(403).json({ error: 'User is not a teacher' });
  }

  const data = createAssignmentSchema.parse(req.body);

  const assignment = await prisma.assignment.create({
    data: {
      title: data.title,
      description: data.description,
      dueDate: new Date(data.dueDate),
      courseId: data.courseId,
      teacherId: user.teacherProfile.id,
      collegeId
    }
  });

  res.json({ data: assignment });
};

export const deleteAssignment = async (req, res) => {
  const { id } = req.params;
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;

  await prisma.assignment.deleteMany({
    where: { id, collegeId }
  });

  res.json({ success: true });
};
