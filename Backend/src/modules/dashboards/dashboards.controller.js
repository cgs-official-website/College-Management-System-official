import { prisma } from '../../server.js';

export const getDashboardStats = async (req, res) => {
  try {
    const { isSuperAdmin } = req.query;

    if (isSuperAdmin === 'true') {
      const [totalColleges, totalStudents, totalTeachers, activeCourses, recentColleges] = await Promise.all([
        prisma.college.count(),
        prisma.student.count(),
        prisma.teacher.count(),
        prisma.course.count({ where: { deletedAt: null } }),
        prisma.college.findMany({ orderBy: { createdAt: 'desc' }, take: 5 })
      ]);
      
      const recentActivity = recentColleges.map(c => ({
        id: `c-${c.id}`,
        title: 'New College Onboarded',
        desc: `${c.name} joined the platform.`,
        time: c.createdAt,
        type: 'college'
      }));

      return res.json({
        data: {
          totalColleges,
          totalStudents,
          totalTeachers,
          activeCourses,
          attendanceRate: 85, // Mock global rate
          recentActivity
        }
      });
    }

    const { collegeId } = req.tenant;

    const [totalStudents, totalTeachers, activeCourses, recentStudents, recentTeachers] = await Promise.all([
      prisma.student.count({ where: { collegeId } }),
      prisma.teacher.count({ where: { collegeId } }),
      prisma.course.count({ where: { collegeId, deletedAt: null } }),
      prisma.student.findMany({ where: { collegeId }, orderBy: { createdAt: 'desc' }, take: 4, include: { user: true } }),
      prisma.teacher.findMany({ where: { collegeId }, orderBy: { createdAt: 'desc' }, take: 4, include: { user: true } })
    ]);

    const recentActivity = [
      ...recentStudents.map(s => ({
        id: `s-${s.id}`,
        title: 'New Student Admission',
        desc: `${s.user.name || 'A student'} enrolled (Roll: ${s.rollNumber}).`,
        time: s.createdAt,
        type: 'student'
      })),
      ...recentTeachers.map(t => ({
        id: `t-${t.id}`,
        title: 'New Staff Onboarded',
        desc: `${t.user.name || 'A teacher'} joined as ${t.designation}.`,
        time: t.createdAt,
        type: 'teacher'
      }))
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5);

    res.json({
      data: {
        totalStudents,
        totalTeachers,
        activeCourses,
        attendanceRate: 85, // Mock attendance rate
        totalColleges: 1,
        recentActivity
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
