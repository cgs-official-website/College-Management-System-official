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

    // Fetch dynamic stats from database
    const [totalClasses, studentsTaught] = await Promise.all([
      prisma.section.count({
        where: { collegeId, teachers: { some: { id: teacherId } } }
      }),
      prisma.student.count({
        where: { collegeId, section: { teachers: { some: { id: teacherId } } } }
      })
    ]);

    // Assignments and attendance are still mocked as they might require complex aggregation
    res.json({
      data: {
        totalClasses,
        studentsTaught,
        attendanceRate: 92, // To be implemented with attendance module
        pendingGrades: 5 // To be implemented with grades module
      }
    });

  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};
