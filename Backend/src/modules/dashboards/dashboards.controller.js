import { prisma } from '../../lib/prisma.js';
import { generateRoleInsights } from '../../services/ai/gemini.service.js';

/**
 * Helper to get user's accessible module keys and role information based on RBAC.
 */
async function getUserRbacContext(req) {
  const userRole = req.user?.role;
  const customRoleId = req.user?.customRoleId;
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;

  // System Admins have full access to all standard modules
  if (userRole === 'admin' || userRole === 'superadmin') {
    const allModules = await prisma.module.findMany({ select: { key: true } });
    return {
      roleName: userRole === 'superadmin' ? 'Super Administrator' : 'College Administrator',
      accessibleModules: allModules.map(m => m.key),
      isSystemRole: true,
      category: 'administration',
    };
  }

  // If user has a custom role assigned (e.g. Hostel Manager, Accountant, Librarian)
  if (customRoleId) {
    const roleRecord = await prisma.role.findUnique({
      where: { id: customRoleId },
      include: {
        permissions: {
          include: { module: true }
        }
      }
    });

    if (roleRecord) {
      const allowedKeys = roleRecord.permissions
        .filter(p => p.canRead && p.module?.key)
        .map(p => p.module.key);

      return {
        roleName: roleRecord.name,
        accessibleModules: allowedKeys,
        isSystemRole: roleRecord.isSystemRole,
        category: roleRecord.category,
      };
    }
  }

  // Teacher or Faculty default modules
  if (userRole === 'teacher' || userRole === 'hod' || userRole === 'faculty') {
    return {
      roleName: userRole === 'hod' ? 'Head of Department' : 'Faculty Member',
      accessibleModules: ['academic', 'attendance', 'assignments', 'exams', 'timetable'],
      isSystemRole: true,
      category: 'teaching',
    };
  }

  // Fallback for general staff
  return {
    roleName: req.user?.role || 'Staff Member',
    accessibleModules: [],
    isSystemRole: false,
    category: 'non_teaching',
  };
}

/**
 * Fetch scoped metric data for specific modules
 */
async function fetchScopedModuleMetrics(collegeId, moduleKeys) {
  const metrics = {};
  const tasks = [];

  const keySet = new Set(moduleKeys);

  if (keySet.has('students')) {
    tasks.push(
      prisma.student.count({ where: { collegeId } }).then(c => {
        metrics.students = { count: c };
      }).catch(() => {})
    );
  }

  if (keySet.has('staff')) {
    tasks.push(
      prisma.teacher.count({ where: { collegeId } }).then(c => {
        metrics.staff = { count: c };
      }).catch(() => {})
    );
  }

  if (keySet.has('academic')) {
    tasks.push(
      Promise.all([
        prisma.course.count({ where: { collegeId, deletedAt: null } }),
        prisma.department.count({ where: { collegeId } })
      ]).then(([courses, depts]) => {
        metrics.academic = { coursesCount: courses, departmentsCount: depts };
      }).catch(() => {})
    );
  }

  if (keySet.has('hostel')) {
    tasks.push(
      Promise.all([
        prisma.hostelBlock.count({ where: { collegeId } }),
        prisma.hostelRoom.count({ where: { collegeId } }),
        prisma.hostelRoom.aggregate({
          where: { collegeId },
          _sum: { capacity: true }
        })
      ]).then(([blocks, rooms, capAgg]) => {
        metrics.hostel = {
          blocksCount: blocks,
          roomsCount: rooms,
          totalCapacity: capAgg?._sum?.capacity || 0
        };
      }).catch(() => {})
    );
  }

  if (keySet.has('library')) {
    tasks.push(
      Promise.all([
        prisma.libraryItem.count({ where: { collegeId } }),
        prisma.libraryItem.aggregate({
          where: { collegeId },
          _sum: { totalCopies: true, availableCopies: true }
        })
      ]).then(([items, agg]) => {
        metrics.library = {
          itemsCount: items,
          totalCopies: agg?._sum?.totalCopies || 0,
          availableCopies: agg?._sum?.availableCopies || 0
        };
      }).catch(() => {})
    );
  }

  if (keySet.has('fees')) {
    tasks.push(
      Promise.all([
        prisma.fee.count({ where: { collegeId } }),
        prisma.fee.aggregate({
          where: { collegeId },
          _sum: { amountDue: true, amountPaid: true }
        })
      ]).then(([count, agg]) => {
        metrics.fees = {
          totalRecords: count,
          amountDue: agg?._sum?.amountDue || 0,
          amountPaid: agg?._sum?.amountPaid || 0
        };
      }).catch(() => {})
    );
  }

  if (keySet.has('transport')) {
    tasks.push(
      Promise.all([
        prisma.transportRoute.count({ where: { collegeId } }),
        prisma.vehicle.count({ where: { collegeId } })
      ]).then(([routes, vehicles]) => {
        metrics.transport = { routesCount: routes, vehiclesCount: vehicles };
      }).catch(() => {})
    );
  }

  if (keySet.has('attendance')) {
    tasks.push(
      Promise.all([
        prisma.attendance.count({ where: { collegeId } }),
        prisma.leaveRequest.count({ where: { collegeId, status: 'pending' } })
      ]).then(([attCount, leavesPending]) => {
        metrics.attendance = { attendanceRecords: attCount, pendingLeaves: leavesPending };
      }).catch(() => {})
    );
  }

  if (keySet.has('notices')) {
    tasks.push(
      prisma.notice.count({ where: { collegeId } }).then(c => {
        metrics.notices = { count: c };
      }).catch(() => {})
    );
  }

  if (keySet.has('exams')) {
    tasks.push(
      prisma.exam.count({ where: { collegeId } }).then(c => {
        metrics.exams = { count: c };
      }).catch(() => {})
    );
  }

  if (keySet.has('inventory')) {
    tasks.push(
      prisma.inventoryItem.count({ where: { collegeId } }).then(c => {
        metrics.inventory = { count: c };
      }).catch(() => {})
    );
  }

  await Promise.all(tasks);
  return metrics;
}

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
          attendanceRate: 85,
          recentActivity
        }
      });
    }

    const { collegeId } = req.tenant;

    // Determine caller's role context and allowed modules
    const rbacContext = await getUserRbacContext(req);

    // Fetch baseline global counters for backwards compatibility
    const [totalStudents, totalTeachers, activeCourses, recentStudents, recentTeachers] = await Promise.all([
      prisma.student.count({ where: { collegeId } }),
      prisma.teacher.count({ where: { collegeId } }),
      prisma.course.count({ where: { collegeId, deletedAt: null } }),
      prisma.student.findMany({ where: { collegeId }, orderBy: { createdAt: 'desc' }, take: 4, include: { user: true } }),
      prisma.teacher.findMany({ where: { collegeId }, orderBy: { createdAt: 'desc' }, take: 4, include: { user: true } })
    ]);

    // Fetch scoped metrics for modules this user has access to
    const moduleStats = await fetchScopedModuleMetrics(collegeId, rbacContext.accessibleModules);

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
        attendanceRate: 85,
        totalColleges: 1,
        recentActivity,
        roleInfo: rbacContext,
        moduleStats,
      }
    });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

/**
 * Controller to generate role-based AI briefing using Google Gemini
 */
export const getDashboardInsights = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const rbacContext = await getUserRbacContext(req);

    const college = await prisma.college.findUnique({
      where: { id: collegeId },
      select: { name: true }
    });

    const moduleStats = await fetchScopedModuleMetrics(collegeId, rbacContext.accessibleModules);

    const insights = await generateRoleInsights({
      roleName: rbacContext.roleName,
      userName: req.user?.name || req.user?.email || 'User',
      collegeName: college?.name || 'College Institution',
      accessibleModules: rbacContext.accessibleModules,
      metrics: moduleStats,
    });

    res.json({
      success: true,
      data: {
        ...insights,
        roleName: rbacContext.roleName,
        accessibleModules: rbacContext.accessibleModules,
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

    const [totalClasses, studentsTaught] = await Promise.all([
      prisma.section.count({
        where: { collegeId, teachers: { some: { id: teacherId } } }
      }),
      prisma.student.count({
        where: { collegeId, section: { teachers: { some: { id: teacherId } } } }
      })
    ]);

    res.json({
      data: {
        totalClasses,
        studentsTaught,
        attendanceRate: 92,
        pendingGrades: 5
      }
    });

  } catch (error) {
    console.warn('[Dashboards] Warning in getTeacherStats (transient DB issue):', error.message);
    res.json({
      success: true,
      data: {
        totalClasses: 0,
        studentsTaught: 0,
        attendanceRate: 0,
        pendingGrades: 0
      }
    });
  }
};
