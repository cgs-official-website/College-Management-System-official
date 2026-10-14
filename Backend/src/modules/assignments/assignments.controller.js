import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { notify } from '../notifications/notify.service.js';
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
      course: true,
      teacher: {
        include: {
          user: {
            select: { name: true, email: true }
          }
        }
      },
      _count: {
        select: {
          submissions: true
        }
      }
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
    teacherName: a.teacher?.user?.name || 'Faculty',
    submissionsCount: a._count?.submissions || 0,
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

  let teacherId = req.body.teacherId;
  if (!teacherId) {
    if (user?.teacherProfile) {
      teacherId = user.teacherProfile.id;
    } else if (user?.role === 'admin' || user?.role === 'superadmin') {
      const firstTeacher = await prisma.teacher.findFirst({ where: { collegeId } });
      teacherId = firstTeacher?.id;
    }
  }

  if (!teacherId) {
    return res.status(400).json({ error: 'No teacher profile available to assign' });
  }

  const data = createAssignmentSchema.parse(req.body);

  const assignment = await prisma.assignment.create({
    data: {
      title: data.title,
      description: data.description,
      dueDate: new Date(data.dueDate),
      courseId: data.courseId,
      teacherId,
      collegeId
    },
    include: {
      course: true
    }
  });

  // Notify students enrolled in this course
  try {
    const students = await prisma.student.findMany({
      where: {
        collegeId,
        deletedAt: null,
        userId: { not: null },
        OR: [
          { courseId: data.courseId },
          { section: { courseId: data.courseId } },
          { enrollments: { some: { courseId: data.courseId } } }
        ]
      },
      select: { userId: true }
    });

    let recipientUserIds = [...new Set(students.map(s => s.userId).filter(Boolean))];

    // Fallback: if no direct course students found, check department students
    if (recipientUserIds.length === 0 && assignment.course?.departmentId) {
      const deptStudents = await prisma.student.findMany({
        where: {
          collegeId,
          departmentId: assignment.course.departmentId,
          deletedAt: null,
          userId: { not: null }
        },
        select: { userId: true }
      });
      recipientUserIds = [...new Set(deptStudents.map(s => s.userId).filter(Boolean))];
    }

    if (recipientUserIds.length > 0) {
      const dueDateStr = new Date(data.dueDate).toISOString().slice(0, 10);
      await notify({
        collegeId,
        target: { userIds: recipientUserIds },
        title: 'New Assignment Posted',
        message: `New assignment '${data.title}' has been posted for ${assignment.course?.name || 'your course'}. Due date: ${dueDateStr}.`,
        type: 'assignment_new',
        link: '/student/assignments',
      });
      logger?.info?.(`[Assignments] Notification sent to ${recipientUserIds.length} students for assignment ${assignment.id}`);
    }
  } catch (notifErr) {
    logger?.error?.(`[Assignments] Notification error: ${notifErr.message}`);
  }

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

export const getAssignmentSubmissions = async (req, res) => {
  const { id } = req.params;
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;

  const submissions = await prisma.assignmentSubmission.findMany({
    where: { assignmentId: id, collegeId },
    include: {
      student: {
        include: {
          user: { select: { name: true, email: true } },
          department: { select: { name: true } }
        }
      }
    },
    orderBy: { submittedAt: 'desc' }
  });

  const formatted = submissions.map(s => ({
    id: s.id,
    studentName: s.student?.user?.name || 'Student',
    admissionNumber: s.student?.admissionNumber || 'N/A',
    department: s.student?.department?.name || 'Academic',
    fileUrl: s.fileUrl,
    submittedAt: s.submittedAt,
    status: s.status,
    score: s.score,
    feedback: s.feedback
  }));

  res.json({ data: formatted });
};
