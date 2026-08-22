import { prisma } from '../../server.js';

export const getDashboardStats = async (req, res) => {
  try {
    const { isSuperAdmin } = req.query;

    if (isSuperAdmin === 'true') {
      const [totalColleges, totalStudents, totalTeachers, activeCourses] = await Promise.all([
        prisma.college.count(),
        prisma.student.count(),
        prisma.teacher.count(),
        prisma.course.count({ where: { deletedAt: null } })
      ]);
      return res.json({
        data: {
          totalColleges,
          totalStudents,
          totalTeachers,
          activeCourses,
          attendanceRate: 85, // Mock global rate
        }
      });
    }

    const { collegeId } = req.tenant;

    const [totalStudents, totalTeachers, activeCourses] = await Promise.all([
      prisma.student.count({ where: { collegeId } }),
      prisma.teacher.count({ where: { collegeId } }),
      prisma.course.count({ where: { collegeId, deletedAt: null } }),
    ]);

    res.json({
      data: {
        totalStudents,
        totalTeachers,
        activeCourses,
        attendanceRate: 85, // Mock attendance rate
        totalColleges: 1,
      }
    });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

export const getTeacherStats = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const { userId } = req.user;

    // Fetch the teacher profile ID for the current user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { teacherProfile: true }
    });

    if (!user || !user.teacherProfile) {
      return res.json({
        data: {
          totalClasses: 0,
          studentsTaught: 0,
          attendanceRate: 0,
          pendingGrades: 0
        }
      });
    }

    const teacherId = user.teacherProfile.id;

    // For now, mock the stats until we have full assignments & grades modules ready
    res.json({
      data: {
        totalClasses: 4,
        studentsTaught: 120,
        attendanceRate: 92,
        pendingGrades: 5
      }
    });

  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};
