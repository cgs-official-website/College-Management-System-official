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
