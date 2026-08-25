import { prisma } from '../../server.js';

export const resolveStudent = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const collegeId = req.user?.collegeId;

    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    if (req.user?.role !== 'student' && req.user?.role !== 'superadmin') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access restricted to student accounts' } });
    }

    const student = await prisma.student.findFirst({
      where: {
        userId,
        deletedAt: null,
        ...(collegeId ? { collegeId } : {})
      },
      include: {
        department: true,
        section: true,
        course: true,
        hostelBlock: true,
        college: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            accountStatus: true
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ success: false, error: { code: 'STUDENT_NOT_FOUND', message: 'Student profile record not found' } });
    }

    req.student = student;
    req.tenant = { collegeId: student.collegeId };
    next();
  } catch (error) {
    console.error('Error resolving student:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};
