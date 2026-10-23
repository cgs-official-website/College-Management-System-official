import crypto from 'crypto';
import { prisma, pool } from '../../lib/prisma.js';

let tableInitialized = false;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Automatically ensures the CalendarEvent table exists in PostgreSQL.
 * Uses direct pool queries when available with multi-statement safety, pgcrypto support, and DDL fallbacks.
 */
export async function ensureCalendarTable() {
  if (tableInitialized) return;
  try {
    // 1. Enable pgcrypto extension for gen_random_uuid() if permissions permit
    try {
      if (pool) {
        await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
      } else {
        await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pgcrypto;');
      }
    } catch (_) {
      // Ignore if user lacks superuser permissions or extension already active
    }

    // 2. Primary DDL: Create CalendarEvent table with UUID default
    const createTableDDL = `
      CREATE TABLE IF NOT EXISTS "CalendarEvent" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "collegeId" UUID NOT NULL,
        "title" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "type" VARCHAR(50) NOT NULL DEFAULT 'event',
        "startDate" TIMESTAMP WITH TIME ZONE NOT NULL,
        "endDate" TIMESTAMP WITH TIME ZONE,
        "allDay" BOOLEAN DEFAULT false,
        "location" VARCHAR(255),
        "targetAudience" VARCHAR(50) DEFAULT 'all',
        "departmentId" UUID,
        "createdById" UUID,
        "createdByName" VARCHAR(255),
        "createdByRole" VARCHAR(50),
        "color" VARCHAR(50),
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    if (pool) {
      await pool.query(createTableDDL);
    } else {
      await prisma.$executeRawUnsafe(createTableDDL);
    }

    try {
      if (pool) {
        await pool.query('CREATE INDEX IF NOT EXISTS "idx_cal_event_college" ON "CalendarEvent"("collegeId");');
        await pool.query('CREATE INDEX IF NOT EXISTS "idx_cal_event_date" ON "CalendarEvent"("startDate");');
      } else {
        await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "idx_cal_event_college" ON "CalendarEvent"("collegeId");');
        await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "idx_cal_event_date" ON "CalendarEvent"("startDate");');
      }
    } catch (_) {
      // Index creation can be safely skipped if already created or on concurrency
    }

    tableInitialized = true;
    console.log('[Calendar] ✅ CalendarEvent table verified/created successfully');
  } catch (err) {
    console.warn('[Calendar] Primary table check failed, applying fallback DDL:', err.message);
    try {
      // Fallback DDL without gen_random_uuid() in case DB lacks pgcrypto extension
      const fallbackDDL = `
        CREATE TABLE IF NOT EXISTS "CalendarEvent" (
          "id" UUID PRIMARY KEY,
          "collegeId" UUID NOT NULL,
          "title" VARCHAR(255) NOT NULL,
          "description" TEXT,
          "type" VARCHAR(50) NOT NULL DEFAULT 'event',
          "startDate" TIMESTAMP WITH TIME ZONE NOT NULL,
          "endDate" TIMESTAMP WITH TIME ZONE,
          "allDay" BOOLEAN DEFAULT false,
          "location" VARCHAR(255),
          "targetAudience" VARCHAR(50) DEFAULT 'all',
          "departmentId" UUID,
          "createdById" UUID,
          "createdByName" VARCHAR(255),
          "createdByRole" VARCHAR(50),
          "color" VARCHAR(50),
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      if (pool) {
        await pool.query(fallbackDDL);
      } else {
        await prisma.$executeRawUnsafe(fallbackDDL);
      }
      tableInitialized = true;
      console.log('[Calendar] ✅ CalendarEvent table created via fallback DDL');
    } catch (fallbackErr) {
      console.error('[Calendar] Critical error creating CalendarEvent table:', fallbackErr.message);
    }
  }
}

/**
 * Role check helper: Only ADMIN and HOD can access / manage calendar.
 */
export function canManageCalendar(user, isUserHod = false) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  return role === 'admin' || role === 'principal' || role === 'hod' || role === 'superadmin' || Boolean(user.isHod) || Boolean(isUserHod);
}

/**
 * Resolves user calendar context including role, department, HOD status, custom role, designation, and management permissions.
 */
export async function resolveUserCalendarContext(user, collegeId) {
  const userId = user?.id || user?.userId;
  if (!userId || !UUID_REGEX.test(String(userId))) {
    return {
      userId: null,
      role: 'guest',
      customRoleId: null,
      customRoleName: null,
      designation: null,
      departmentId: null,
      departmentName: null,
      courseId: null,
      sectionId: null,
      enrolledCourseIds: [],
      teacherCourseIds: [],
      isHod: false,
      isPrincipal: false,
      canManage: false
    };
  }

  const role = String(user.role || '').trim().toLowerCase();
  const cleanRole = role.replace(/[-_\s]/g, '');
  const isAdmin = cleanRole === 'admin' || cleanRole === 'collegeadmin' || role.includes('admin');
  const isSuperAdmin = cleanRole === 'superadmin';
  const isPrincipalRole = cleanRole === 'principal' || role.includes('principal');
  let isHod = cleanRole === 'hod' || role.includes('hod') || Boolean(user.isHod) || Boolean(user.isHOD);
  let departmentId = user.departmentId || null;
  let departmentName = null;
  let customRoleId = user.customRoleId || null;
  let customRoleName = null;
  let designation = null;
  let courseId = null;
  let sectionId = null;
  let enrolledCourseIds = [];
  let teacherCourseIds = [];

  if (isAdmin || isSuperAdmin || isPrincipalRole) {
    return {
      userId,
      role: isSuperAdmin ? 'superadmin' : (isAdmin ? 'admin' : 'principal'),
      customRoleId: null,
      customRoleName: null,
      designation: role,
      departmentId: null,
      departmentName: null,
      courseId: null,
      sectionId: null,
      enrolledCourseIds: [],
      teacherCourseIds: [],
      isHod: false,
      isPrincipal: true,
      canManage: true
    };
  }

  // Fetch full user record to resolve custom role, teacher profile (department & designation)
  let userRecord = null;
  try {
    userRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        customRoleId: true,
        customRole: { select: { id: true, name: true } },
        teacherProfile: {
          select: {
            id: true,
            departmentId: true,
            designation: true,
            department: { select: { id: true, name: true, hodUserId: true } }
          }
        }
      }
    });

    if (userRecord) {
      if (userRecord.customRole?.name) {
        customRoleName = userRecord.customRole.name;
        customRoleId = userRecord.customRole.id;
      }
      if (userRecord.teacherProfile) {
        if (!departmentId && userRecord.teacherProfile.departmentId) {
          departmentId = userRecord.teacherProfile.departmentId;
          departmentName = userRecord.teacherProfile.department?.name || null;
        }
        if (userRecord.teacherProfile.designation) {
          designation = userRecord.teacherProfile.designation;
        }
        // If teacher's department assigns them as HOD directly
        const deptHodId = userRecord.teacherProfile.department?.hodUserId;
        if (deptHodId && (deptHodId === userId || deptHodId === userRecord.teacherProfile.id)) {
          isHod = true;
        }
      }
    }
  } catch (err) {
    console.warn('[Calendar] Error fetching user role/profile details:', err.message);
  }

  const isPrincipal = isPrincipalRole ||
    (designation && designation.toLowerCase() === 'principal') ||
    (customRoleName && customRoleName.toLowerCase() === 'principal');

  // 1. Check if user is HOD of any department in this college (via userId OR teacherProfile.id)
  try {
    const teacherProfileId = userRecord?.teacherProfile?.id;
    const orConditions = [{ hodUserId: userId }];
    if (teacherProfileId) {
      orConditions.push({ hodUserId: teacherProfileId });
    }
    const deptWhere = {
      OR: orConditions
    };
    if (collegeId && UUID_REGEX.test(String(collegeId))) {
      deptWhere.collegeId = collegeId;
    }
    const hodDept = await prisma.department.findFirst({
      where: deptWhere,
      select: { id: true, name: true }
    });

    if (hodDept) {
      isHod = true;
      if (!departmentId) departmentId = hodDept.id;
      departmentName = hodDept.name;
    }
  } catch (err) {
    console.warn('[Calendar] Error checking HOD department:', err.message);
  }

  if (!isHod && designation) {
    const dLower = designation.toLowerCase();
    if (dLower.includes('hod') || dLower.includes('head') || dLower.includes('dean')) {
      isHod = true;
    }
  }
  if (!isHod && customRoleName) {
    const crLower = customRoleName.toLowerCase();
    if (crLower.includes('hod') || crLower.includes('head') || crLower.includes('dean')) {
      isHod = true;
    }
  }

  // 2. If student, find student course, section, department & enrollments
  if (role === 'student') {
    try {
      const student = await prisma.student.findUnique({
        where: { userId },
        select: {
          id: true,
          courseId: true,
          sectionId: true,
          departmentId: true,
          department: { select: { id: true, name: true } },
          enrollments: {
            where: { status: 'enrolled' },
            select: { courseId: true }
          }
        }
      });
      if (student) {
        courseId = student.courseId || null;
        sectionId = student.sectionId || null;
        if (student.departmentId) {
          departmentId = student.departmentId;
          departmentName = student.department?.name || null;
        }
        if (Array.isArray(student.enrollments)) {
          enrolledCourseIds = student.enrollments.map((e) => e.courseId).filter(Boolean);
        }
      }
    } catch (err) {
      console.warn('[Calendar] Error fetching student department & courses:', err.message);
    }
  }

  // 3. Fallback for teacher or staff
  if (role === 'teacher' || role === 'faculty' || role === 'staff') {
    try {
      const teacher = await prisma.teacher.findUnique({
        where: { userId },
        select: {
          id: true,
          departmentId: true,
          department: { select: { id: true, name: true } },
          timetable: { select: { courseId: true } },
          sections: { select: { courseId: true } }
        }
      });
      if (teacher) {
        if (!departmentId && teacher.departmentId) {
          departmentId = teacher.departmentId;
          departmentName = teacher.department?.name || null;
        }
        const tCourses = [
          ...(teacher.timetable?.map((t) => t.courseId) || []),
          ...(teacher.sections?.map((s) => s.courseId) || [])
        ].filter(Boolean);
        teacherCourseIds = [...new Set(tCourses)];
      }
    } catch (err) {
      console.warn('[Calendar] Error fetching teacher/staff department & courses:', err.message);
    }
  }

  let canManage = isHod || role === 'admin' || role === 'superadmin' || isPrincipal || isAdmin;
  if (!canManage && (role.includes('dean') || role.includes('coordinator') || role.includes('director') || role.includes('head'))) {
    canManage = true;
  }
  if (!canManage && customRoleId) {
    try {
      const hasPerm = await prisma.rolePermission.findFirst({
        where: {
          roleId: customRoleId,
          module: { key: { in: ['calendar', 'events', 'exams'] } },
          OR: [{ canCreate: true }, { canUpdate: true }]
        }
      });
      if (hasPerm) {
        canManage = true;
      }
    } catch (_) {}
  }

  return {
    userId,
    role,
    customRoleId,
    customRoleName,
    designation,
    departmentId,
    departmentName,
    courseId,
    sectionId,
    enrolledCourseIds,
    teacherCourseIds,
    isHod,
    isPrincipal,
    canManage
  };
}

/**
 * Automatically creates in-app notification for assigned audience roles
 */
async function sendCalendarNotification({ collegeId, event, isUpdate = false }) {
  if (!collegeId || !event) return;

  const rawAud = String(event.targetAudience || 'everyone').toLowerCase().trim();
  const evType = String(event.type || 'event').toLowerCase();
  let titlePrefix = '📅 Calendar Event';
  if (evType === 'exam') titlePrefix = '📝 Exam Scheduled';
  else if (evType === 'holiday') titlePrefix = '🌴 Campus Holiday';
  else if (evType === 'academic') titlePrefix = '🎓 Academic Event';
  else if (evType === 'meeting') titlePrefix = '🤝 Meeting Scheduled';

  const notifTitle = `${isUpdate ? 'Updated' : 'New'} ${titlePrefix}: ${event.title}`;

  const sDate = event.startDate ? new Date(event.startDate) : null;
  const dateStr = sDate ? sDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Upcoming';
  const timeStr = event.allDay ? 'All Day' : (sDate ? sDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
  const locStr = event.location ? ` • Location: ${event.location}` : '';

  // 1. Explicit Department targeting: Only when targetAudience is specifically set to a department (e.g. dept:<id>)
  const isExplicitDept = rawAud.startsWith('dept:') || rawAud.startsWith('department:');
  const targetDeptId = isExplicitDept ? (rawAud.split(':')[1] || event.departmentId) : null;

  if (targetDeptId && UUID_REGEX.test(targetDeptId)) {
    try {
      const [dept, deptStudents, deptTeachers] = await Promise.all([
        prisma.department.findUnique({
          where: { id: targetDeptId },
          select: { id: true, name: true, hodUserId: true }
        }),
        prisma.student.findMany({
          where: { collegeId, departmentId: targetDeptId, userId: { not: null } },
          select: { userId: true }
        }),
        prisma.teacher.findMany({
          where: { collegeId, departmentId: targetDeptId, userId: { not: null } },
          select: { userId: true }
        })
      ]);

      const recipientUserIds = new Set();
      (deptStudents || []).forEach((s) => s.userId && recipientUserIds.add(s.userId));
      (deptTeachers || []).forEach((t) => t.userId && recipientUserIds.add(t.userId));
      if (dept?.hodUserId) recipientUserIds.add(dept.hodUserId);

      if (recipientUserIds.size > 0) {
        const userIdsArray = Array.from(recipientUserIds);
        const deptLabel = dept?.name ? `${dept.name} Department` : 'Department';
        const notifMessage = `${event.title} (${dateStr}${timeStr ? `, ${timeStr}` : ''}${locStr}). Assigned: ${deptLabel}.`;

        await prisma.notification.createMany({
          data: userIdsArray.map((uid) => ({
            collegeId,
            userId: uid,
            targetRole: null,
            title: notifTitle,
            message: notifMessage,
            type: evType === 'exam' ? 'warning' : 'calendar',
            link: '/calendar',
            isRead: false,
            readBy: []
          }))
        });
        return;
      }
    } catch (err) {
      console.error('[Calendar Notification] Error sending department notifications:', err.message);
    }
  }

  // 2. Role-specific targeting: Strictly targeted ONLY to the assigned role (e.g. library staff, staff, students, teachers)
  let targetRole = 'all';
  if (rawAud === 'everyone' || rawAud === 'all') {
    targetRole = 'all';
  } else if (rawAud === 'students' || rawAud === 'student') {
    targetRole = 'student';
  } else if (rawAud === 'teachers' || rawAud === 'teacher' || rawAud === 'faculty') {
    targetRole = 'teacher';
  } else if (rawAud === 'hod' || rawAud === 'hods') {
    targetRole = 'hod';
  } else if (rawAud === 'admin' || rawAud === 'admins') {
    targetRole = 'admin';
  } else if (rawAud === 'staff') {
    targetRole = 'staff';
  } else {
    // Custom role slug / name, e.g. 'library staff', 'office staff', etc.
    targetRole = rawAud;
  }

  const roleLabel = targetRole === 'all' ? 'EVERYONE' : targetRole.toUpperCase();
  const notifMessage = `${event.title} (${dateStr}${timeStr ? `, ${timeStr}` : ''}${locStr}). Target: ${roleLabel}.`;

  try {
    await prisma.notification.create({
      data: {
        collegeId,
        targetRole,
        title: notifTitle,
        message: notifMessage,
        type: evType === 'exam' ? 'warning' : 'calendar',
        link: '/calendar',
        isRead: false,
        readBy: []
      }
    });
  } catch (err) {
    console.error('[Calendar Notification] Failed to create in-app notification:', err.message);
  }
}

/**
 * GET /api/v1/calendar/events
 */
export const getCalendarEvents = async (req, res) => {
  await ensureCalendarTable();

  const collegeId = req.tenant?.collegeId || req.user?.collegeId || req.query.collegeId;
  if (!collegeId || !UUID_REGEX.test(String(collegeId))) {
    return res.json({
      success: true,
      count: 0,
      data: [],
      canManage: false,
      userRole: null,
      userDepartment: null
    });
  }

  const userContext = await resolveUserCalendarContext(req.user, collegeId);
  const { month, year, startDate, endDate, type, search, targetAudience } = req.query;

  try {
    // 1. Fetch from CalendarEvent table
    let query = `SELECT * FROM "CalendarEvent" WHERE "collegeId" = $1::uuid`;
    const params = [collegeId];
    let paramIndex = 2;

    // Visibility restriction for regular users (Teachers, Students, Staff)
    // Regular users have View-Only access and can ONLY see events targeted to:
    // 1) Everyone
    // 2) Their specific role
    // 3) Their department
    const isAdmin = userContext.role === 'admin' || userContext.role === 'superadmin' || Boolean(userContext.isPrincipal);
    if (!isAdmin) {
      const role = String(userContext.role || '').toLowerCase();
      const userDeptId = userContext.departmentId;
      const customRoleName = String(userContext.customRoleName || '').toLowerCase().trim();
      const designation = String(userContext.designation || '').toLowerCase().trim();
      const isStudent = role === 'student';
      const isTeacher = role === 'teacher' || role === 'faculty';
      const isStaff = role === 'staff';
      const isHod = Boolean(userContext.isHod);

      const visConditions = [
        `(LOWER("targetAudience") = 'everyone' OR LOWER("targetAudience") = 'all' OR "targetAudience" IS NULL OR "targetAudience" = '' OR LOWER("type") = 'exam')`
      ];

      if (isStudent) {
        if (userDeptId && UUID_REGEX.test(userDeptId)) {
          visConditions.push(`(LOWER("targetAudience") IN ('student', 'students') AND ("departmentId" IS NULL OR "departmentId" = $${paramIndex}::uuid))`);
          params.push(userDeptId);
          paramIndex++;
        } else {
          visConditions.push(`(LOWER("targetAudience") IN ('student', 'students') AND "departmentId" IS NULL)`);
        }
      } else if (isTeacher) {
        if (userDeptId && UUID_REGEX.test(userDeptId)) {
          visConditions.push(`(LOWER("targetAudience") IN ('teacher', 'teachers', 'faculty') AND ("departmentId" IS NULL OR "departmentId" = $${paramIndex}::uuid))`);
          params.push(userDeptId);
          paramIndex++;
        } else {
          visConditions.push(`(LOWER("targetAudience") IN ('teacher', 'teachers', 'faculty') AND "departmentId" IS NULL)`);
        }

        if (isHod) {
          if (userDeptId && UUID_REGEX.test(userDeptId)) {
            visConditions.push(`(LOWER("targetAudience") IN ('hod', 'hods') AND ("departmentId" IS NULL OR "departmentId" = $${paramIndex}::uuid))`);
            params.push(userDeptId);
            paramIndex++;
          } else {
            visConditions.push(`(LOWER("targetAudience") IN ('hod', 'hods') AND "departmentId" IS NULL)`);
          }
        }
      } else if (isStaff) {
        // Staff sees events targeted to all staff
        visConditions.push(`(
          LOWER("targetAudience") IN ('staff', 'staffs', 'non-teaching', 'non_teaching', 'non-teaching staff', 'non teaching staff')
        )`);
      }

      // Universal specific role matching (e.g. "admin office", "admin_office", or any custom role assigned)
      const userRolesToCheck = new Set();
      if (role && !['student', 'teacher', 'faculty'].includes(role)) {
        userRolesToCheck.add(role);
        userRolesToCheck.add(role.replace(/_/g, ' '));
        userRolesToCheck.add(role.replace(/\s+/g, '_'));
      }
      if (customRoleName) {
        userRolesToCheck.add(customRoleName);
        userRolesToCheck.add(customRoleName.replace(/_/g, ' '));
        userRolesToCheck.add(customRoleName.replace(/\s+/g, '_'));
      }
      if (designation && designation !== customRoleName) {
        userRolesToCheck.add(designation);
        userRolesToCheck.add(designation.replace(/_/g, ' '));
        userRolesToCheck.add(designation.replace(/\s+/g, '_'));
      }

      for (const rName of userRolesToCheck) {
        if (!rName) continue;
        const rLower = rName.toLowerCase().trim();
        visConditions.push(`(
          LOWER("targetAudience") = $${paramIndex}
          OR LOWER("targetAudience") = $${paramIndex + 1}
          OR LOWER("targetAudience") ILIKE $${paramIndex + 2}
          OR $${paramIndex} ILIKE '%' || LOWER("targetAudience") || '%'
        )`);
        params.push(rLower, rLower.replace(/\s+/g, '_'), `%${rLower}%`);
        paramIndex += 3;
      }

      // If user role or custom role represents an administrative office role, also match admin audiences
      if (role.includes('admin') || customRoleName.includes('admin')) {
        visConditions.push(`LOWER("targetAudience") IN ('admin', 'admins')`);
      }

      // If user has customRoleId
      if (userContext.customRoleId && UUID_REGEX.test(String(userContext.customRoleId))) {
        visConditions.push(`("targetAudience" = $${paramIndex} OR LOWER("targetAudience") = $${paramIndex})`);
        params.push(String(userContext.customRoleId).toLowerCase());
        paramIndex++;
      }

      // Department-specific broadcasts (only if audience is the department itself or everyone)
      if (userDeptId && UUID_REGEX.test(userDeptId)) {
        visConditions.push(`(
          ("departmentId" = $${paramIndex}::uuid AND (LOWER("targetAudience") IN ('everyone', 'all') OR "targetAudience" IS NULL OR "targetAudience" = ''))
          OR LOWER("targetAudience") = $${paramIndex + 1}
          OR LOWER("targetAudience") = $${paramIndex + 2}
        )`);
        params.push(userDeptId, `dept:${userDeptId.toLowerCase()}`, `department:${userDeptId.toLowerCase()}`);
        paramIndex += 3;
      }

      query += ` AND (${visConditions.join(' OR ')})`;
    }

    if (type && type !== 'all') {
      query += ` AND LOWER("type") = $${paramIndex}`;
      params.push(type.toLowerCase());
      paramIndex++;
    }

    if (targetAudience && targetAudience !== 'all') {
      const audLower = targetAudience.toLowerCase().trim();
      if (audLower === 'everyone') {
        query += ` AND (LOWER("targetAudience") = 'everyone' OR LOWER("targetAudience") = 'all' OR LOWER("type") = 'exam')`;
      } else if (audLower.startsWith('dept:')) {
        const dId = audLower.split(':')[1];
        if (dId && UUID_REGEX.test(dId)) {
          query += ` AND ("departmentId" = $${paramIndex}::uuid OR LOWER("targetAudience") = $${paramIndex + 1} OR LOWER("type") = 'exam')`;
          params.push(dId, audLower);
          paramIndex += 2;
        }
      } else {
        query += ` AND (LOWER("targetAudience") = $${paramIndex} OR LOWER("targetAudience") = 'everyone' OR LOWER("targetAudience") = 'all' OR LOWER("type") = 'exam'`;
        if (audLower === 'teachers' || audLower === 'teacher') {
          query += ` OR LOWER("targetAudience") = 'teacher' OR LOWER("targetAudience") = 'teachers' OR LOWER("targetAudience") = 'faculty'`;
        } else if (audLower === 'students' || audLower === 'student') {
          query += ` OR LOWER("targetAudience") = 'student' OR LOWER("targetAudience") = 'students'`;
        } else if (audLower === 'staff') {
          query += ` OR LOWER("targetAudience") = 'staff' OR LOWER("targetAudience") = 'staffs' OR LOWER("targetAudience") LIKE '%staff%'`;
        } else if (audLower === 'admin' || audLower === 'admins') {
          query += ` OR LOWER("targetAudience") = 'admin' OR LOWER("targetAudience") = 'admins' OR LOWER("targetAudience") = 'superadmin'`;
        }
        query += `)`;
        params.push(audLower);
        paramIndex++;
      }
    }

    if (startDate && endDate) {
      query += ` AND "startDate" >= $${paramIndex}::timestamp AND "startDate" <= $${paramIndex + 1}::timestamp`;
      params.push(new Date(startDate).toISOString(), new Date(endDate).toISOString());
      paramIndex += 2;
    } else if (month && year) {
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      const startOfMonth = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0)).toISOString();
      const endOfMonth = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)).toISOString();
      query += ` AND "startDate" >= $${paramIndex}::timestamp AND "startDate" <= $${paramIndex + 1}::timestamp`;
      params.push(startOfMonth, endOfMonth);
      paramIndex += 2;
    }

    if (search && search.trim()) {
      query += ` AND ("title" ILIKE $${paramIndex} OR "description" ILIKE $${paramIndex})`;
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    query += ` ORDER BY "startDate" ASC`;

    const customEvents = await prisma.$queryRawUnsafe(query, ...params).catch(async (e) => {
      console.warn('[Calendar] Query fallback:', e.message);
      if (e.message && (e.message.includes('42P01') || e.message.includes('CalendarEvent'))) {
        tableInitialized = false;
        await ensureCalendarTable().catch(() => {});
      }
      return [];
    });

    // 2. Fetch existing Exams from the Exam model to automatically display in calendar
    let examEvents = [];
    if (!type || type === 'all' || type.toLowerCase() === 'exam') {
      try {
        const examWhere = { collegeId };

        // Date range filtering for exams
        if (startDate && endDate) {
          const s = new Date(startDate);
          const e = new Date(endDate);
          examWhere.date = {
            gte: new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate(), 0, 0, 0)),
            lte: new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate(), 23, 59, 59, 999))
          };
        } else if (month && year) {
          const m = parseInt(month, 10);
          const y = parseInt(year, 10);
          const startOfMonth = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
          const endOfMonth = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
          examWhere.date = {
            gte: startOfMonth,
            lte: endOfMonth
          };
        }

        // Search filtering for exams
        if (search && search.trim()) {
          const term = search.trim();
          examWhere.AND = [
            {
              OR: [
                { name: { contains: term, mode: 'insensitive' } },
                { type: { contains: term, mode: 'insensitive' } },
                { course: { name: { contains: term, mode: 'insensitive' } } },
                { course: { code: { contains: term, mode: 'insensitive' } } }
              ]
            }
          ];
        }

        // When college admin/HOD creates exams, automatically display to all authorized roles in that college:
        // Admin, Principal, Teachers, Staff, and Students.
        // Multi-tenancy isolation strictly prevents users from other colleges from seeing these exams.
        if (req.query.departmentId && UUID_REGEX.test(String(req.query.departmentId))) {
          examWhere.course = { departmentId: String(req.query.departmentId) };
        }

        const exams = await prisma.exam.findMany({
          where: examWhere,
          include: {
            course: {
              select: { name: true, code: true, departmentId: true }
            }
          },
          orderBy: { date: 'asc' }
        });

        examEvents = (exams || []).map((exam) => {
          const dStr = exam.date instanceof Date
            ? exam.date.toISOString().split('T')[0]
            : String(exam.date).split('T')[0];

          return {
            id: `exam-${exam.id}`,
            originalExamId: exam.id,
            collegeId: exam.collegeId,
            departmentId: exam.course?.departmentId || null,
            title: `Exam: ${exam.name}`,
            description: exam.course?.name
              ? `Course: ${exam.course.name} (${exam.course.code || 'N/A'})\nMax Marks: ${exam.maxMarks}\nType: ${exam.type || 'Examination'}`
              : `Max Marks: ${exam.maxMarks}\nType: ${exam.type || 'Examination'}`,
            type: 'exam',
            startDate: `${dStr}T09:00:00.000Z`,
            endDate: `${dStr}T12:00:00.000Z`,
            date: dStr,
            allDay: true,
            location: exam.room || 'Examination Hall',
            targetAudience: 'everyone',
            color: '#ef4444',
            isExamRecord: true,
            createdAt: exam.createdAt,
            updatedAt: exam.updatedAt
          };
        });
      } catch (e) {
        console.warn('[Calendar] Error fetching exam events:', e.message);
      }
    }

    // Deduplicate: If any customEvent in CalendarEvent represents an exam that already exists in examEvents
    const existingExamTitlesAndDates = new Set();
    examEvents.forEach((ev) => {
      const cleanTitle = ev.title.replace(/^Exam:\s*/i, '').trim().toLowerCase();
      const dateKey = ev.date || (ev.startDate ? ev.startDate.slice(0, 10) : '');
      existingExamTitlesAndDates.add(`${cleanTitle}|${dateKey}`);
    });

    const deduplicatedCustom = (customEvents || []).filter((ce) => {
      if (ce.type?.toLowerCase() === 'exam') {
        const cleanTitle = (ce.title || '').replace(/^Exam:\s*/i, '').trim().toLowerCase();
        const ceDate = ce.startDate ? new Date(ce.startDate).toISOString().slice(0, 10) : '';
        if (existingExamTitlesAndDates.has(`${cleanTitle}|${ceDate}`)) {
          return false; // Skip redundant custom event
        }
      }
      return true;
    });

    // Merge custom events and exam records safely
    const allEvents = [...deduplicatedCustom, ...examEvents].sort((a, b) => {
      const timeA = a.startDate ? new Date(a.startDate).getTime() : 0;
      const timeB = b.startDate ? new Date(b.startDate).getTime() : 0;
      return timeA - timeB;
    });

    return res.json({
      success: true,
      count: allEvents.length,
      data: allEvents,
      canManage: userContext.canManage,
      userRole: userContext.role,
      userDepartment: userContext.departmentName
    });
  } catch (err) {
    console.error('[Calendar] Error fetching events:', err);
    return res.json({
      success: true,
      count: 0,
      data: [],
      canManage: userContext.canManage,
      userRole: userContext.role,
      userDepartment: userContext.departmentName
    });
  }
};

/**
 * GET /api/v1/calendar/events/:id
 */
export const getCalendarEventById = async (req, res) => {
  await ensureCalendarTable();
  const { id } = req.params;
  const collegeId = req.tenant?.collegeId || req.user?.collegeId || req.query.collegeId;

  const userContext = await resolveUserCalendarContext(req.user, collegeId);

  try {
    if (id.startsWith('exam-')) {
      const realId = id.replace('exam-', '');
      const exam = await prisma.exam.findFirst({
        where: { id: realId, collegeId },
        include: { course: true }
      });
      if (!exam) return res.status(404).json({ success: false, error: 'Exam not found' });

      // Exams scheduled for the college are accessible to all authenticated roles of that college
      return res.json({
        success: true,
        data: {
          id,
          title: `Exam: ${exam.name}`,
          type: 'exam',
          startDate: exam.date,
          endDate: exam.date,
          allDay: true,
          location: 'Examination Hall',
          description: `Course: ${exam.course?.name || 'General'}\nMax Marks: ${exam.maxMarks}`,
          isExamRecord: true
        }
      });
    }

    if (!UUID_REGEX.test(String(id))) {
      return res.status(404).json({ success: false, error: 'Calendar event not found' });
    }

    const rows = await prisma.$queryRawUnsafe(
      `SELECT * FROM "CalendarEvent" WHERE "id" = $1::uuid AND "collegeId" = $2::uuid LIMIT 1`,
      id,
      collegeId
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Calendar event not found' });
    }

    const event = rows[0];

    // Regular users visibility enforcement
    const isAdmin = userContext.role === 'admin' || userContext.role === 'superadmin';
    if (!isAdmin) {
      const aud = String(event.targetAudience || 'everyone').toLowerCase().trim();
      const role = String(userContext.role || '').toLowerCase();
      const userDeptId = userContext.departmentId;
      const customRoleName = String(userContext.customRoleName || '').toLowerCase().trim();
      const designation = String(userContext.designation || '').toLowerCase().trim();
      const isHod = Boolean(userContext.isHod);

      const isEveryone = aud === 'everyone' || aud === 'all' || !event.targetAudience;
      const isMyRole = (role === 'student' && (aud === 'student' || aud === 'students')) ||
                       ((role === 'teacher' || role === 'faculty') && (aud === 'teacher' || aud === 'teachers' || aud === 'faculty')) ||
                       (isHod && (aud === 'hod' || aud === 'hods')) ||
                       (role === 'staff' && (aud === 'staff' || aud === 'staffs' || aud === 'non-teaching' || aud === 'non_teaching' || aud === 'non-teaching staff')) ||
                       (role && (aud === role || aud === role.replace(/_/g, ' ') || aud === role.replace(/\s+/g, '_') || aud.includes(role) || role.includes(aud))) ||
                       (customRoleName && (aud === customRoleName || aud === customRoleName.replace(/\s+/g, '_') || aud === customRoleName.replace(/_/g, ' ') || aud.includes(customRoleName) || customRoleName.includes(aud))) ||
                       (designation && (aud === designation || aud === designation.replace(/\s+/g, '_') || aud === designation.replace(/_/g, ' ') || aud.includes(designation) || designation.includes(aud))) ||
                       ((role.includes('admin') || customRoleName.includes('admin')) && (aud === 'admin' || aud === 'admins')) ||
                       (userContext.customRoleId && aud === String(userContext.customRoleId).toLowerCase());

      const isDeptBroadcast = userDeptId && (
        aud === `dept:${userDeptId.toLowerCase()}` ||
        aud === `department:${userDeptId.toLowerCase()}` ||
        (event.departmentId === userDeptId && isEveryone)
      );

      const hasDeptConflict = event.departmentId && userDeptId && event.departmentId !== userDeptId;

      if ((!isEveryone && !isDeptBroadcast && !isMyRole) || hasDeptConflict) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You do not have permission to view this event.'
        });
      }
    }

    return res.json({ success: true, data: event });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};


/**
 * POST /api/v1/calendar/events
 */
/**
 * POST /api/v1/calendar/events
 */
export const createCalendarEvent = async (req, res) => {
  await ensureCalendarTable();

  const collegeId = req.tenant?.collegeId || req.body.collegeId || req.user?.collegeId;
  if (!collegeId || !UUID_REGEX.test(String(collegeId))) {
    return res.status(400).json({ success: false, error: 'Valid College ID is required' });
  }

  const userContext = await resolveUserCalendarContext(req.user, collegeId);
  if (!userContext.canManage) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Only College Admins and HODs can schedule calendar events or exams. Regular users have View-Only access.'
    });
  }

  const {
    title,
    description = '',
    type = 'event',
    startDate,
    endDate,
    allDay = false,
    location = '',
    targetAudience = 'all',
    departmentId = null,
    color = null
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, error: 'Event title is required' });
  }

  if (!startDate) {
    return res.status(400).json({ success: false, error: 'Start date is required' });
  }

  let assignedColor = color;
  if (!assignedColor) {
    switch (type.toLowerCase()) {
      case 'exam':
        assignedColor = '#ef4444';
        break;
      case 'holiday':
        assignedColor = '#10b981';
        break;
      case 'academic':
        assignedColor = '#6366f1';
        break;
      case 'meeting':
        assignedColor = '#f59e0b';
        break;
      default:
        assignedColor = '#3b82f6';
    }
  }

  try {
    const sDate = new Date(startDate);
    const eDate = endDate ? new Date(endDate) : sDate;

    let resolvedDeptId = departmentId && UUID_REGEX.test(departmentId) ? departmentId : null;
    if (!resolvedDeptId && targetAudience && (targetAudience.startsWith('dept:') || targetAudience.startsWith('department:'))) {
      const parsed = targetAudience.split(':')[1];
      if (parsed && UUID_REGEX.test(parsed)) resolvedDeptId = parsed;
    }
    if (!resolvedDeptId && userContext.isHod && userContext.departmentId) {
      if (targetAudience === 'department' || targetAudience === 'dept') {
        resolvedDeptId = userContext.departmentId;
      }
    }

    // When an exam is created via the Calendar module, persist directly to the Exam database to maintain single source of truth
    if (type && type.toLowerCase() === 'exam') {
      const examName = title.trim().replace(/^Exam:\s*/i, '');
      const roomValue = (location || 'Examination Hall').trim();

      // Find or establish an appropriate course in this college/department
      let targetCourseId = null;
      if (resolvedDeptId) {
        const deptCourse = await prisma.course.findFirst({
          where: { collegeId, departmentId: resolvedDeptId }
        });
        if (deptCourse) targetCourseId = deptCourse.id;
      }
      if (!targetCourseId) {
        const anyCourse = await prisma.course.findFirst({ where: { collegeId } });
        if (anyCourse) {
          targetCourseId = anyCourse.id;
        } else {
          let dept = resolvedDeptId
            ? await prisma.department.findFirst({ where: { id: resolvedDeptId, collegeId } })
            : await prisma.department.findFirst({ where: { collegeId } });
          if (!dept) {
            dept = await prisma.department.create({
              data: { collegeId, name: 'General Department', code: 'GEN' }
            });
          }
          const createdCourse = await prisma.course.create({
            data: {
              collegeId,
              departmentId: dept.id,
              name: 'General Academic Program',
              code: 'GEN-101',
              semester: 1,
              credits: 3
            }
          });
          targetCourseId = createdCourse.id;
        }
      }

      const createdExam = await prisma.exam.create({
        data: {
          collegeId,
          courseId: targetCourseId,
          name: examName,
          date: sDate,
          maxMarks: 100,
          type: 'Midterm',
          status: 'pending',
          room: roomValue
        },
        include: {
          course: {
            include: { department: true }
          }
        }
      });

      const dStr = createdExam.date.toISOString().split('T')[0];
      const createdExamEvent = {
        id: `exam-${createdExam.id}`,
        originalExamId: createdExam.id,
        collegeId: createdExam.collegeId,
        departmentId: createdExam.course?.departmentId || null,
        title: `Exam: ${createdExam.name}`,
        description: createdExam.course?.name
          ? `Course: ${createdExam.course.name} (${createdExam.course.code || 'N/A'})\nMax Marks: ${createdExam.maxMarks}`
          : `Max Marks: ${createdExam.maxMarks}`,
        type: 'exam',
        startDate: `${dStr}T09:00:00.000Z`,
        endDate: `${dStr}T12:00:00.000Z`,
        date: dStr,
        allDay: true,
        location: roomValue,
        targetAudience: 'everyone',
        color: '#ef4444',
        isExamRecord: true,
        createdAt: createdExam.createdAt,
        updatedAt: createdExam.updatedAt
      };

      sendCalendarNotification({
        collegeId,
        event: createdExamEvent,
        isUpdate: false
      }).catch((err) => console.error('[Calendar Notification Error]:', err));

      return res.status(201).json({
        success: true,
        message: 'Exam scheduled successfully and synchronized with calendar',
        data: createdExamEvent
      });
    }

    const eventId = crypto.randomUUID();
    const insertSql = `
      INSERT INTO "CalendarEvent" (
        "id", "collegeId", "title", "description", "type",
        "startDate", "endDate", "allDay", "location",
        "targetAudience", "departmentId", "createdById",
        "createdByName", "createdByRole", "color"
      ) VALUES (
        $1::uuid, $2::uuid, $3, $4, $5,
        $6::timestamp, $7::timestamp, $8, $9,
        $10, ($11::text)::uuid, ($12::text)::uuid,
        $13, $14, $15
      )
      RETURNING *
    `;
    const insertParams = [
      eventId,
      collegeId,
      title.trim(),
      description.trim(),
      type.toLowerCase(),
      sDate.toISOString(),
      eDate.toISOString(),
      Boolean(allDay),
      location.trim(),
      targetAudience,
      resolvedDeptId,
      req.user?.id && UUID_REGEX.test(req.user.id) ? req.user.id : null,
      req.user?.name || req.user?.email || (userContext.isHod ? 'HOD' : 'Admin'),
      req.user?.role || (userContext.isHod ? 'hod' : 'admin'),
      assignedColor
    ];

    let rows;
    try {
      if (pool) {
        const poolRes = await pool.query(insertSql, insertParams);
        rows = poolRes.rows;
      } else {
        rows = await prisma.$queryRawUnsafe(insertSql, ...insertParams);
      }
    } catch (insertErr) {
      // Auto-recover if table was missing (e.g. 42P01 relation "CalendarEvent" does not exist)
      if (insertErr.message && (insertErr.message.includes('42P01') || insertErr.message.includes('CalendarEvent'))) {
        console.warn('[Calendar] CalendarEvent table missing during insert, auto-creating table and retrying...');
        tableInitialized = false;
        await ensureCalendarTable();
        if (pool) {
          const poolRetry = await pool.query(insertSql, insertParams);
          rows = poolRetry.rows;
        } else {
          rows = await prisma.$queryRawUnsafe(insertSql, ...insertParams);
        }
      } else {
        throw insertErr;
      }
    }

    const createdEvent = rows && rows[0] ? rows[0] : null;
    if (!createdEvent) {
      throw new Error('Failed to create calendar event record');
    }

    // Send in-app notification to the assigned target role(s)
    sendCalendarNotification({
      collegeId,
      event: createdEvent,
      isUpdate: false
    }).catch((err) => console.error('[Calendar Notification Error]:', err));

    return res.status(201).json({
      success: true,
      message: 'Calendar event created successfully',
      data: createdEvent
    });
  } catch (err) {
    console.error('[Calendar] Error creating event:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * PUT /api/v1/calendar/events/:id
 */
export const updateCalendarEvent = async (req, res) => {
  await ensureCalendarTable();

  const { id } = req.params;
  const collegeId = req.tenant?.collegeId || req.body?.collegeId || req.user?.collegeId || req.query?.collegeId;

  const userContext = await resolveUserCalendarContext(req.user, collegeId);
  if (!userContext.canManage) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Only ADMIN and HOD can edit calendar events and exams. Regular users have View-Only access.'
    });
  }

  if (id.startsWith('exam-')) {
    const realId = id.replace('exam-', '');
    try {
      const updated = await prisma.exam.update({
        where: { id: realId },
        data: {
          name: req.body.title ? req.body.title.replace(/^Exam:\s*/, '') : undefined,
          date: req.body.startDate ? new Date(req.body.startDate) : undefined
        },
        include: {
          course: {
            select: { name: true, code: true, departmentId: true }
          }
        }
      });
      const dStr = updated.date instanceof Date ? updated.date.toISOString().split('T')[0] : String(updated.date).split('T')[0];
      const formatted = {
        id: `exam-${updated.id}`,
        originalExamId: updated.id,
        collegeId: updated.collegeId,
        departmentId: updated.course?.departmentId || null,
        title: `Exam: ${updated.name}`,
        description: updated.course?.name
          ? `Course: ${updated.course.name} (${updated.course.code || 'N/A'})\nMax Marks: ${updated.maxMarks}\nType: ${updated.type || 'Examination'}`
          : `Max Marks: ${updated.maxMarks}\nType: ${updated.type || 'Examination'}`,
        type: 'exam',
        startDate: `${dStr}T09:00:00.000Z`,
        endDate: `${dStr}T12:00:00.000Z`,
        date: dStr,
        allDay: true,
        location: updated.room || 'Examination Hall',
        targetAudience: 'everyone',
        color: '#ef4444',
        isExamRecord: true,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt
      };
      return res.json({
        success: true,
        message: 'Exam updated successfully',
        data: formatted
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (!UUID_REGEX.test(String(id))) {
    return res.status(404).json({ success: false, error: 'Calendar event not found' });
  }

  try {
    const {
      title,
      description,
      type,
      startDate,
      endDate,
      allDay,
      location,
      targetAudience,
      departmentId,
      color
    } = req.body;

    let existingRows;
    const selectSql = collegeId && UUID_REGEX.test(String(collegeId))
      ? `SELECT * FROM "CalendarEvent" WHERE "id" = $1::uuid AND "collegeId" = $2::uuid LIMIT 1`
      : `SELECT * FROM "CalendarEvent" WHERE "id" = $1::uuid LIMIT 1`;
    const selectParams = collegeId && UUID_REGEX.test(String(collegeId)) ? [id, collegeId] : [id];

    if (pool) {
      const poolRes = await pool.query(selectSql, selectParams);
      existingRows = poolRes.rows;
    } else {
      existingRows = await prisma.$queryRawUnsafe(selectSql, ...selectParams);
    }

    if (!existingRows || existingRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Calendar event not found' });
    }

    const current = existingRows[0];
    const eventCollegeId = current.collegeId || collegeId;
    const newTitle = title !== undefined && title !== null ? String(title).trim() : current.title;
    const newDesc = description !== undefined && description !== null ? String(description).trim() : (current.description || '');
    const newType = type !== undefined && type !== null ? String(type).toLowerCase().trim() : current.type;
    const newStart = startDate ? new Date(startDate).toISOString() : (current.startDate ? new Date(current.startDate).toISOString() : new Date().toISOString());
    const newEnd = endDate
      ? new Date(endDate).toISOString()
      : (startDate ? new Date(startDate).toISOString() : (current.endDate ? new Date(current.endDate).toISOString() : newStart));
    const newAllDay = allDay !== undefined ? Boolean(allDay) : Boolean(current.allDay);
    const newLoc = location !== undefined && location !== null ? String(location).trim() : (current.location || '');
    const newAudience = targetAudience !== undefined && targetAudience !== null ? String(targetAudience).trim() : (current.targetAudience || 'everyone');

    let newColor = color !== undefined && color !== null ? color : current.color;
    if (!newColor || (type && String(type).toLowerCase() !== String(current.type).toLowerCase())) {
      const t = newType.toLowerCase();
      if (t === 'exam') newColor = '#ef4444';
      else if (t === 'holiday') newColor = '#10b981';
      else if (t === 'academic') newColor = '#6366f1';
      else if (t === 'meeting') newColor = '#f59e0b';
      else newColor = '#3b82f6';
    }

    let newDeptId = current.departmentId;
    if (departmentId !== undefined) {
      newDeptId = departmentId && UUID_REGEX.test(String(departmentId)) ? String(departmentId) : null;
    } else if (newAudience && (newAudience.startsWith('dept:') || newAudience.startsWith('department:'))) {
      const parsedId = newAudience.split(':')[1];
      newDeptId = parsedId && UUID_REGEX.test(parsedId) ? parsedId : null;
    }

    const updateParams = [
      newTitle,
      newDesc,
      newType,
      newStart,
      newEnd,
      newAllDay,
      newLoc,
      newAudience
    ];

    let deptSql = `"departmentId" = NULL`;
    if (newDeptId && UUID_REGEX.test(String(newDeptId))) {
      updateParams.push(String(newDeptId));
      deptSql = `"departmentId" = $${updateParams.length}::uuid`;
    }

    updateParams.push(newColor);
    const colorParamIdx = updateParams.length;

    updateParams.push(id);
    const idParamIdx = updateParams.length;

    const updateSql = `
      UPDATE "CalendarEvent"
      SET
        "title" = $1,
        "description" = $2,
        "type" = $3,
        "startDate" = $4::timestamptz,
        "endDate" = $5::timestamptz,
        "allDay" = $6,
        "location" = $7,
        "targetAudience" = $8,
        ${deptSql},
        "color" = $${colorParamIdx},
        "updatedAt" = NOW()
      WHERE "id" = $${idParamIdx}::uuid
      RETURNING *
    `;

    let rows;
    if (pool) {
      const poolRes = await pool.query(updateSql, updateParams);
      rows = poolRes.rows;
    } else {
      rows = await prisma.$queryRawUnsafe(updateSql, ...updateParams);
    }

    const updatedEvent = rows && rows[0] ? rows[0] : null;
    if (!updatedEvent) {
      throw new Error('Update failed to modify record');
    }

    // Send in-app notification on calendar event update to the assigned target role(s)
    sendCalendarNotification({
      collegeId: eventCollegeId,
      event: updatedEvent,
      isUpdate: true
    }).catch((err) => console.error('[Calendar Notification Error]:', err));

    return res.json({
      success: true,
      message: 'Calendar event updated successfully',
      data: updatedEvent
    });
  } catch (err) {
    console.error('[Calendar] Error updating event:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * DELETE /api/v1/calendar/events/:id
 */
export const deleteCalendarEvent = async (req, res) => {
  await ensureCalendarTable();

  const { id } = req.params;
  const collegeId = req.tenant?.collegeId || req.body?.collegeId || req.user?.collegeId || req.query?.collegeId;

  const userContext = await resolveUserCalendarContext(req.user, collegeId);
  if (!userContext.canManage) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Only ADMIN and HOD can delete calendar events and exams. Regular users have View-Only access.'
    });
  }

  try {
    if (id.startsWith('exam-')) {
      const realId = id.replace('exam-', '');

      // Delete associated marks first to satisfy foreign key constraint Mark_examId_fkey
      await prisma.mark.deleteMany({
        where: { examId: realId }
      });

      const deletedExam = await prisma.exam.delete({
        where: { id: realId }
      }).catch((e) => {
        return null;
      });

      // Clean up any legacy custom CalendarEvent matching this exam
      try {
        if (deletedExam?.name) {
          const delSql = collegeId && UUID_REGEX.test(String(collegeId))
            ? `DELETE FROM "CalendarEvent" WHERE "collegeId" = $1::uuid AND "type" = 'exam' AND ("title" = $2 OR "title" = $3)`
            : `DELETE FROM "CalendarEvent" WHERE "type" = 'exam' AND ("title" = $1 OR "title" = $2)`;
          const delParams = collegeId && UUID_REGEX.test(String(collegeId))
            ? [collegeId, deletedExam.name, `Exam: ${deletedExam.name}`]
            : [deletedExam.name, `Exam: ${deletedExam.name}`];
          if (pool) {
            await pool.query(delSql, delParams);
          } else {
            await prisma.$executeRawUnsafe(delSql, ...delParams);
          }
        }
      } catch (_) {}

      return res.json({ success: true, message: 'Exam deleted successfully' });
    }

    if (!UUID_REGEX.test(String(id))) {
      return res.status(404).json({ success: false, error: 'Calendar event not found' });
    }

    let result = 0;
    if (collegeId && UUID_REGEX.test(String(collegeId))) {
      result = await prisma.$executeRawUnsafe(
        `DELETE FROM "CalendarEvent" WHERE "id" = $1::uuid AND "collegeId" = $2::uuid`,
        id,
        collegeId
      );
    } else {
      result = await prisma.$executeRawUnsafe(
        `DELETE FROM "CalendarEvent" WHERE "id" = $1::uuid`,
        id
      );
    }

    if (result === 0) {
      // Check if it's an exam ID passed without 'exam-' prefix
      const examWhere = { id };
      if (collegeId && UUID_REGEX.test(String(collegeId))) {
        examWhere.collegeId = collegeId;
      }
      const examExists = await prisma.exam.findFirst({ where: examWhere });
      if (examExists) {
        await prisma.mark.deleteMany({ where: { examId: id } });
        await prisma.exam.delete({ where: { id } });
        return res.json({ success: true, message: 'Exam deleted successfully' });
      }
      return res.status(404).json({ success: false, error: 'Calendar event not found' });
    }

    return res.json({ success: true, message: 'Calendar event deleted successfully' });
  } catch (err) {
    console.error('[Calendar] Error deleting event:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/v1/calendar/summary
 */
export const getCalendarSummary = async (req, res) => {
  await ensureCalendarTable();
  const collegeId = req.tenant?.collegeId || req.user?.collegeId || req.query.collegeId;

  if (!collegeId || !UUID_REGEX.test(String(collegeId))) {
    return res.json({
      success: true,
      data: {
        todayCount: 0,
        upcomingExamsCount: 0,
        upcomingEvents: [],
        canManage: false
      }
    });
  }

  const userContext = await resolveUserCalendarContext(req.user, collegeId);

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

    let todayQuery = `SELECT COUNT(*)::int as count FROM "CalendarEvent" WHERE "collegeId" = $1::uuid AND "startDate" >= $2::timestamp AND "startDate" <= $3::timestamp`;
    let upcomingQuery = `SELECT * FROM "CalendarEvent" WHERE "collegeId" = $1::uuid AND "startDate" >= $2::timestamp`;
    const todayParams = [collegeId, todayStart, todayEnd];
    const upcomingParams = [collegeId, todayStart];

    const isAdmin = userContext.role === 'admin' || userContext.role === 'superadmin' || Boolean(userContext.isPrincipal);
    if (!isAdmin) {
      const role = String(userContext.role || '').toLowerCase();
      const userDeptId = userContext.departmentId;
      const customRoleName = String(userContext.customRoleName || '').toLowerCase().trim();
      const designation = String(userContext.designation || '').toLowerCase().trim();
      const isStudent = role === 'student';
      const isTeacher = role === 'teacher' || role === 'faculty';
      const isStaff = role === 'staff';
      const isHod = Boolean(userContext.isHod);

      let pIdxToday = 4;
      const visToday = [
        `(LOWER("targetAudience") = 'everyone' OR LOWER("targetAudience") = 'all' OR "targetAudience" IS NULL OR "targetAudience" = '' OR LOWER("type") = 'exam')`
      ];

      let pIdxUpcoming = 3;
      const visUpcoming = [
        `(LOWER("targetAudience") = 'everyone' OR LOWER("targetAudience") = 'all' OR "targetAudience" IS NULL OR "targetAudience" = '' OR LOWER("type") = 'exam')`
      ];

      if (isStudent) {
        if (userDeptId && UUID_REGEX.test(userDeptId)) {
          visToday.push(`(LOWER("targetAudience") IN ('student', 'students') AND ("departmentId" IS NULL OR "departmentId" = $${pIdxToday}::uuid))`);
          todayParams.push(userDeptId);
          pIdxToday++;

          visUpcoming.push(`(LOWER("targetAudience") IN ('student', 'students') AND ("departmentId" IS NULL OR "departmentId" = $${pIdxUpcoming}::uuid))`);
          upcomingParams.push(userDeptId);
          pIdxUpcoming++;
        } else {
          visToday.push(`(LOWER("targetAudience") IN ('student', 'students') AND "departmentId" IS NULL)`);
          visUpcoming.push(`(LOWER("targetAudience") IN ('student', 'students') AND "departmentId" IS NULL)`);
        }
      } else if (isTeacher) {
        if (userDeptId && UUID_REGEX.test(userDeptId)) {
          visToday.push(`(LOWER("targetAudience") IN ('teacher', 'teachers', 'faculty') AND ("departmentId" IS NULL OR "departmentId" = $${pIdxToday}::uuid))`);
          todayParams.push(userDeptId);
          pIdxToday++;

          visUpcoming.push(`(LOWER("targetAudience") IN ('teacher', 'teachers', 'faculty') AND ("departmentId" IS NULL OR "departmentId" = $${pIdxUpcoming}::uuid))`);
          upcomingParams.push(userDeptId);
          pIdxUpcoming++;
        } else {
          visToday.push(`(LOWER("targetAudience") IN ('teacher', 'teachers', 'faculty') AND "departmentId" IS NULL)`);
          visUpcoming.push(`(LOWER("targetAudience") IN ('teacher', 'teachers', 'faculty') AND "departmentId" IS NULL)`);
        }

        if (isHod) {
          if (userDeptId && UUID_REGEX.test(userDeptId)) {
            visToday.push(`(LOWER("targetAudience") IN ('hod', 'hods') AND ("departmentId" IS NULL OR "departmentId" = $${pIdxToday}::uuid))`);
            todayParams.push(userDeptId);
            pIdxToday++;

            visUpcoming.push(`(LOWER("targetAudience") IN ('hod', 'hods') AND ("departmentId" IS NULL OR "departmentId" = $${pIdxUpcoming}::uuid))`);
            upcomingParams.push(userDeptId);
            pIdxUpcoming++;
          } else {
            visToday.push(`(LOWER("targetAudience") IN ('hod', 'hods') AND "departmentId" IS NULL)`);
            visUpcoming.push(`(LOWER("targetAudience") IN ('hod', 'hods') AND "departmentId" IS NULL)`);
          }
        }
      } else if (isStaff) {
        visToday.push(`(
          LOWER("targetAudience") IN ('staff', 'staffs', 'non-teaching', 'non_teaching', 'non-teaching staff', 'non teaching staff')
        )`);
        visUpcoming.push(`(
          LOWER("targetAudience") IN ('staff', 'staffs', 'non-teaching', 'non_teaching', 'non-teaching staff', 'non teaching staff')
        )`);

        if (customRoleName) {
          const cLower = customRoleName.toLowerCase().trim();
          visToday.push(`(LOWER("targetAudience") = $${pIdxToday} OR LOWER("targetAudience") = $${pIdxToday + 1} OR LOWER("targetAudience") ILIKE $${pIdxToday + 2})`);
          todayParams.push(cLower, cLower.replace(/\s+/g, '_'), `%${cLower}%`);
          pIdxToday += 3;

          visUpcoming.push(`(LOWER("targetAudience") = $${pIdxUpcoming} OR LOWER("targetAudience") = $${pIdxUpcoming + 1} OR LOWER("targetAudience") ILIKE $${pIdxUpcoming + 2})`);
          upcomingParams.push(cLower, cLower.replace(/\s+/g, '_'), `%${cLower}%`);
          pIdxUpcoming += 3;
        }

        if (designation && designation.toLowerCase().trim() !== (customRoleName || '').toLowerCase().trim()) {
          const dLower = designation.toLowerCase().trim();
          visToday.push(`(LOWER("targetAudience") = $${pIdxToday} OR LOWER("targetAudience") ILIKE $${pIdxToday + 1})`);
          todayParams.push(dLower, `%${dLower}%`);
          pIdxToday += 2;

          visUpcoming.push(`(LOWER("targetAudience") = $${pIdxUpcoming} OR LOWER("targetAudience") ILIKE $${pIdxUpcoming + 1})`);
          upcomingParams.push(dLower, `%${dLower}%`);
          pIdxUpcoming += 2;
        }

        if (userContext.customRoleId && UUID_REGEX.test(String(userContext.customRoleId))) {
          visToday.push(`LOWER("targetAudience") = $${pIdxToday}`);
          todayParams.push(String(userContext.customRoleId).toLowerCase());
          pIdxToday++;

          visUpcoming.push(`LOWER("targetAudience") = $${pIdxUpcoming}`);
          upcomingParams.push(String(userContext.customRoleId).toLowerCase());
          pIdxUpcoming++;
        }
      }

      if (userDeptId && UUID_REGEX.test(userDeptId)) {
        visToday.push(`(
          ("departmentId" = $${pIdxToday}::uuid AND (LOWER("targetAudience") IN ('everyone', 'all') OR "targetAudience" IS NULL OR "targetAudience" = ''))
          OR LOWER("targetAudience") = $${pIdxToday + 1}
          OR LOWER("targetAudience") = $${pIdxToday + 2}
        )`);
        todayParams.push(userDeptId, `dept:${userDeptId.toLowerCase()}`, `department:${userDeptId.toLowerCase()}`);
        pIdxToday += 3;

        visUpcoming.push(`(
          ("departmentId" = $${pIdxUpcoming}::uuid AND (LOWER("targetAudience") IN ('everyone', 'all') OR "targetAudience" IS NULL OR "targetAudience" = ''))
          OR LOWER("targetAudience") = $${pIdxUpcoming + 1}
          OR LOWER("targetAudience") = $${pIdxUpcoming + 2}
        )`);
        upcomingParams.push(userDeptId, `dept:${userDeptId.toLowerCase()}`, `department:${userDeptId.toLowerCase()}`);
        pIdxUpcoming += 3;
      }

      todayQuery += ` AND (${visToday.join(' OR ')})`;
      upcomingQuery += ` AND (${visUpcoming.join(' OR ')})`;
    }

    upcomingQuery += ` ORDER BY "startDate" ASC LIMIT 5`;

    const todayEvents = await prisma.$queryRawUnsafe(todayQuery, ...todayParams).catch(() => [{ count: 0 }]);
    const upcomingEvents = await prisma.$queryRawUnsafe(upcomingQuery, ...upcomingParams).catch(() => []);

    // Exam queries for today & upcoming
    const todayStartUtc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0));
    const todayEndUtc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));

    const todayExamWhere = {
      collegeId,
      date: { gte: todayStartUtc, lte: todayEndUtc }
    };

    const upcomingExamWhere = {
      collegeId,
      date: { gte: todayStartUtc }
    };

    const [todayExamsCount, upcomingExamsCount, upcomingExamsList] = await Promise.all([
      prisma.exam.count({ where: todayExamWhere }).catch(() => 0),
      prisma.exam.count({ where: upcomingExamWhere }).catch(() => 0),
      prisma.exam.findMany({
        where: upcomingExamWhere,
        include: { course: true },
        orderBy: { date: 'asc' },
        take: 5
      }).catch(() => [])
    ]);

    const formattedUpcomingExams = (upcomingExamsList || []).map((ex) => {
      const dStr = ex.date instanceof Date ? ex.date.toISOString().split('T')[0] : String(ex.date).split('T')[0];
      return {
        id: `exam-${ex.id}`,
        title: `Exam: ${ex.name}`,
        type: 'exam',
        startDate: `${dStr}T09:00:00.000Z`,
        endDate: `${dStr}T12:00:00.000Z`,
        date: dStr,
        allDay: true,
        location: ex.room || 'Examination Hall',
        targetAudience: 'all',
        color: '#ef4444',
        isExamRecord: true
      };
    });

    const mergedUpcoming = [...(upcomingEvents || []), ...formattedUpcomingExams]
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 5);

    const totalTodayCount = (todayEvents[0]?.count || 0) + todayExamsCount;

    return res.json({
      success: true,
      data: {
        todayCount: totalTodayCount,
        upcomingExamsCount,
        upcomingEvents: mergedUpcoming,
        canManage: userContext.canManage
      }
    });
  } catch (err) {
    return res.json({
      success: true,
      data: {
        todayCount: 0,
        upcomingExamsCount: 0,
        upcomingEvents: [],
        canManage: false
      }
    });
  }
};

/**
 * POST /api/v1/calendar/saturday-rule
 * Allows ADMIN and HOD to batch configure Saturday holidays for a given month.
 * Rule: 'second_fourth' | 'all_holiday' | 'all_working'
 */
export const configureSaturdayRule = async (req, res) => {
  await ensureCalendarTable();

  const collegeId = req.tenant?.collegeId || req.body.collegeId || req.user?.collegeId;
  if (!collegeId || !UUID_REGEX.test(String(collegeId))) {
    return res.status(400).json({ success: false, error: 'Valid College ID is required' });
  }

  const userContext = await resolveUserCalendarContext(req.user, collegeId);
  if (!userContext.canManage) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Only ADMIN and HOD can configure Saturday holidays. Regular users have View-Only access.'
    });
  }

  const { year, month, rule } = req.body;
  if (!year || !month || !rule) {
    return res.status(400).json({ success: false, error: 'Year, month, and rule are required' });
  }

  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const daysInMonth = new Date(y, m, 0).getDate();

  const saturdays = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(y, m - 1, d);
    if (dt.getDay() === 6) {
      saturdays.push(dt);
    }
  }

  const startOfMonth = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0)).toISOString();
  const endOfMonth = new Date(Date.UTC(y, m - 1, daysInMonth, 23, 59, 59, 999)).toISOString();

  try {
    // Delete existing Saturday Holiday events in this month
    await prisma.$executeRawUnsafe(
      `DELETE FROM "CalendarEvent" 
       WHERE "collegeId" = $1::uuid 
         AND "type" = 'holiday' 
         AND ("title" ILIKE '%Saturday%' OR "description" ILIKE '%Saturday%')
         AND "startDate" >= $2::timestamp 
         AND "startDate" <= $3::timestamp`,
      collegeId,
      startOfMonth,
      endOfMonth
    ).catch((e) => console.warn('[Calendar] Delete existing saturday holidays fallback:', e.message));

    const createdHolidays = [];

    for (let i = 0; i < saturdays.length; i++) {
      const sat = saturdays[i];
      const satIndex = i + 1;
      let isHoliday = false;
      const ordinal = satIndex === 1 ? '1st' : satIndex === 2 ? '2nd' : satIndex === 3 ? '3rd' : satIndex === 4 ? '4th' : '5th';
      const label = `${ordinal} Saturday Holiday`;

      if (rule === 'all_holiday') {
        isHoliday = true;
      } else if (rule === 'second_fourth') {
        if (satIndex === 2 || satIndex === 4) {
          isHoliday = true;
        }
      } else if (rule === 'all_working') {
        isHoliday = false;
      }

      if (isHoliday) {
        const sDate = new Date(Date.UTC(y, m - 1, sat.getDate(), 0, 0, 0)).toISOString();
        const eDate = new Date(Date.UTC(y, m - 1, sat.getDate(), 23, 59, 59, 999)).toISOString();
        const satId = crypto.randomUUID();

        const satSql = `INSERT INTO "CalendarEvent" (
            "id", "collegeId", "title", "description", "type",
            "startDate", "endDate", "allDay", "location",
            "targetAudience", "createdById", "createdByName", "createdByRole", "color"
          ) VALUES (
            $1::uuid, $2::uuid, $3, $4, 'holiday',
            $5::timestamp, $6::timestamp, true, 'Campus-wide',
            'all', $7::uuid, $8, $9, '#10b981'
          ) RETURNING *`;
        const satParams = [
          satId,
          collegeId,
          label,
          `Official Saturday holiday (${label}) configured by Admin/HOD.`,
          sDate,
          eDate,
          req.user?.id && UUID_REGEX.test(req.user.id) ? req.user.id : null,
          req.user?.name || req.user?.email || (userContext.isHod ? 'HOD' : 'Admin'),
          req.user?.role || (userContext.isHod ? 'hod' : 'admin')
        ];

        let created;
        try {
          if (pool) {
            const pRes = await pool.query(satSql, satParams);
            created = pRes.rows;
          } else {
            created = await prisma.$queryRawUnsafe(satSql, ...satParams);
          }
        } catch (satErr) {
          if (satErr.message && (satErr.message.includes('42P01') || satErr.message.includes('CalendarEvent'))) {
            tableInitialized = false;
            await ensureCalendarTable();
            if (pool) {
              const pRes = await pool.query(satSql, satParams);
              created = pRes.rows;
            } else {
              created = await prisma.$queryRawUnsafe(satSql, ...satParams);
            }
          } else {
            throw satErr;
          }
        }
        if (created && created[0]) createdHolidays.push(created[0]);
      }
    }

    return res.json({
      success: true,
      message: `Saturday holiday rule '${rule}' applied successfully for ${m}/${y}`,
      data: createdHolidays
    });
  } catch (err) {
    console.error('[Calendar] Error configuring saturday rule:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};


