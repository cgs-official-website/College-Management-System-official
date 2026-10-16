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
  return role === 'admin' || role === 'hod' || role === 'superadmin' || Boolean(user.isHod) || Boolean(isUserHod);
}

/**
 * Resolves user calendar context including role, department, HOD status, and management permissions.
 */
export async function resolveUserCalendarContext(user, collegeId) {
  if (!user || !user.id || !UUID_REGEX.test(String(user.id))) {
    return {
      userId: null,
      role: 'guest',
      departmentId: null,
      departmentName: null,
      isHod: false,
      canManage: false
    };
  }

  const role = String(user.role || '').toLowerCase();
  let isHod = role === 'hod' || Boolean(user.isHod);
  let departmentId = user.departmentId || null;
  let departmentName = null;

  if (role === 'admin' || role === 'superadmin') {
    return {
      userId: user.id,
      role,
      departmentId: null,
      departmentName: null,
      isHod: false,
      canManage: true
    };
  }

  // 1. Check if user is HOD of any department in this college
  try {
    const hodDept = await prisma.department.findFirst({
      where: {
        collegeId,
        hodUserId: user.id
      },
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

  // 2. If student, find student department
  if (!departmentId && role === 'student') {
    try {
      const student = await prisma.student.findUnique({
        where: { userId: user.id },
        select: {
          departmentId: true,
          department: { select: { id: true, name: true } }
        }
      });
      if (student?.departmentId) {
        departmentId = student.departmentId;
        departmentName = student.department?.name || null;
      }
    } catch (err) {
      console.warn('[Calendar] Error fetching student department:', err.message);
    }
  }

  // 3. If teacher or staff, find teacher profile department
  if (!departmentId && (role === 'teacher' || role === 'faculty' || role === 'staff')) {
    try {
      const teacher = await prisma.teacher.findUnique({
        where: { userId: user.id },
        select: {
          departmentId: true,
          department: { select: { id: true, name: true } }
        }
      });
      if (teacher?.departmentId) {
        departmentId = teacher.departmentId;
        departmentName = teacher.department?.name || null;
      }
    } catch (err) {
      console.warn('[Calendar] Error fetching teacher/staff department:', err.message);
    }
  }

  const canManage = isHod || role === 'admin' || role === 'superadmin';

  return {
    userId: user.id,
    role,
    departmentId,
    departmentName,
    isHod,
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

  // 1. Department-specific targeting: Send ONLY to students, teachers, and HOD belonging to this department
  const targetDeptId = event.departmentId || (rawAud.includes(':') ? rawAud.split(':')[1] : null);
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

  // 2. Role-specific targeting: Strictly targeted ONLY to the assigned role (e.g. students, staff, teachers)
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
    if (!userContext.canManage) {
      const role = String(userContext.role || '').toLowerCase();
      const userDeptId = userContext.departmentId;
      const isStudent = role === 'student';
      const isTeacher = role === 'teacher' || role === 'faculty';
      const isStaff = role === 'staff';

      const visConditions = [
        `(LOWER("targetAudience") = 'everyone' OR LOWER("targetAudience") = 'all' OR "targetAudience" IS NULL OR "targetAudience" = '')`
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
      } else if (isStaff) {
        if (userDeptId && UUID_REGEX.test(userDeptId)) {
          visConditions.push(`(LOWER("targetAudience") = 'staff' AND ("departmentId" IS NULL OR "departmentId" = $${paramIndex}::uuid))`);
          params.push(userDeptId);
          paramIndex++;
        } else {
          visConditions.push(`(LOWER("targetAudience") = 'staff' AND "departmentId" IS NULL)`);
        }
      } else if (role) {
        if (userDeptId && UUID_REGEX.test(userDeptId)) {
          visConditions.push(`(LOWER("targetAudience") = $${paramIndex} AND ("departmentId" IS NULL OR "departmentId" = $${paramIndex + 1}::uuid))`);
          params.push(role);
          params.push(userDeptId);
          paramIndex += 2;
        } else {
          visConditions.push(`(LOWER("targetAudience") = $${paramIndex} AND "departmentId" IS NULL)`);
          params.push(role);
          paramIndex++;
        }
      }

      // Department-specific events
      if (userDeptId && UUID_REGEX.test(userDeptId)) {
        visConditions.push(`"departmentId" = $${paramIndex}::uuid`);
        params.push(userDeptId);
        paramIndex++;

        visConditions.push(`LOWER("targetAudience") = $${paramIndex}`);
        params.push(`dept:${userDeptId.toLowerCase()}`);
        paramIndex++;

        visConditions.push(`LOWER("targetAudience") = $${paramIndex}`);
        params.push(`department:${userDeptId.toLowerCase()}`);
        paramIndex++;
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
        query += ` AND (LOWER("targetAudience") = 'everyone' OR LOWER("targetAudience") = 'all')`;
      } else if (audLower.startsWith('dept:')) {
        const dId = audLower.split(':')[1];
        if (dId && UUID_REGEX.test(dId)) {
          query += ` AND ("departmentId" = $${paramIndex}::uuid OR LOWER("targetAudience") = $${paramIndex + 1})`;
          params.push(dId, audLower);
          paramIndex += 2;
        }
      } else {
        query += ` AND (LOWER("targetAudience") = $${paramIndex} OR LOWER("targetAudience") = 'everyone' OR LOWER("targetAudience") = 'all'`;
        if (audLower === 'teachers' || audLower === 'teacher') {
          query += ` OR LOWER("targetAudience") = 'teacher' OR LOWER("targetAudience") = 'teachers' OR LOWER("targetAudience") = 'faculty'`;
        } else if (audLower === 'students' || audLower === 'student') {
          query += ` OR LOWER("targetAudience") = 'student' OR LOWER("targetAudience") = 'students'`;
        } else if (audLower === 'staff') {
          query += ` OR LOWER("targetAudience") = 'staff'`;
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
      const startOfMonth = new Date(y, m - 1, 1).toISOString();
      const endOfMonth = new Date(y, m, 0, 23, 59, 59, 999).toISOString();
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

        // For regular users, exams are filtered by department/course
        if (!userContext.canManage) {
          if (userContext.role === 'staff') {
            if (userContext.departmentId) {
              examWhere.course = { departmentId: userContext.departmentId };
            } else {
              examWhere.id = '__none__'; // Non-teaching staff don't see exams unless in department
            }
          } else if (userContext.departmentId) {
            examWhere.OR = [
              { course: { departmentId: userContext.departmentId } },
              { course: { departmentId: null } }
            ];
          }
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

        examEvents = (exams || []).map((exam) => ({
          id: `exam-${exam.id}`,
          originalExamId: exam.id,
          collegeId: exam.collegeId,
          departmentId: exam.course?.departmentId || null,
          title: `Exam: ${exam.name}`,
          description: exam.course?.name
            ? `Course: ${exam.course.name} (${exam.course.code || 'N/A'})\nMax Marks: ${exam.maxMarks}`
            : `Max Marks: ${exam.maxMarks}`,
          type: 'exam',
          startDate: exam.date,
          endDate: exam.date,
          allDay: true,
          location: 'Examination Hall',
          targetAudience: 'students',
          color: '#ef4444',
          isExamRecord: true,
          createdAt: exam.createdAt,
          updatedAt: exam.updatedAt
        }));
      } catch (e) {
        // Exam table reading fail-open
      }
    }

    // Merge custom events and exam records safely
    const allEvents = [...(customEvents || []), ...examEvents].sort((a, b) => {
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

      // If regular user, verify visibility
      if (!userContext.canManage) {
        if (userContext.role === 'staff') {
          if (!userContext.departmentId || exam.course?.departmentId !== userContext.departmentId) {
            return res.status(403).json({ success: false, error: 'Forbidden: You do not have permission to view this exam.' });
          }
        } else if (userContext.departmentId && exam.course?.departmentId && exam.course.departmentId !== userContext.departmentId) {
          return res.status(403).json({ success: false, error: 'Forbidden: You do not have permission to view this exam.' });
        }
      }

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
    if (!userContext.canManage) {
      const aud = String(event.targetAudience || 'everyone').toLowerCase().trim();
      const role = String(userContext.role || '').toLowerCase();
      const userDeptId = userContext.departmentId;

      const isEveryone = aud === 'everyone' || aud === 'all' || !event.targetAudience;
      const isMyRole = (role === 'student' && (aud === 'student' || aud === 'students')) ||
                       ((role === 'teacher' || role === 'faculty') && (aud === 'teacher' || aud === 'teachers' || aud === 'faculty')) ||
                       (role === 'staff' && aud === 'staff') ||
                       (aud === role);

      const isMyDept = userDeptId && (
        event.departmentId === userDeptId ||
        aud === `dept:${userDeptId.toLowerCase()}` ||
        aud === `department:${userDeptId.toLowerCase()}`
      );

      const hasDeptConflict = event.departmentId && userDeptId && event.departmentId !== userDeptId;

      if (!isEveryone && !isMyDept && (!isMyRole || hasDeptConflict)) {
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
        $10, $11::uuid, $12::uuid,
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
  const collegeId = req.tenant?.collegeId || req.body.collegeId || req.user?.collegeId;

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
        }
      });
      return res.json({
        success: true,
        message: 'Exam updated successfully',
        data: updated
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

    const existing = await prisma.$queryRawUnsafe(
      `SELECT * FROM "CalendarEvent" WHERE "id" = $1::uuid AND "collegeId" = $2::uuid LIMIT 1`,
      id,
      collegeId
    );

    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Calendar event not found' });
    }

    const current = existing[0];
    const newTitle = title !== undefined ? title.trim() : current.title;
    const newDesc = description !== undefined ? description : current.description;
    const newType = type !== undefined ? type.toLowerCase() : current.type;
    const newStart = startDate ? new Date(startDate).toISOString() : current.startDate;
    const newEnd = endDate ? new Date(endDate).toISOString() : (startDate ? new Date(startDate).toISOString() : current.endDate);
    const newAllDay = allDay !== undefined ? Boolean(allDay) : current.allDay;
    const newLoc = location !== undefined ? location : current.location;
    const newAudience = targetAudience !== undefined ? targetAudience : current.targetAudience;
    const newColor = color !== undefined ? color : current.color;

    let newDeptId = current.departmentId;
    if (departmentId !== undefined) {
      newDeptId = departmentId && UUID_REGEX.test(departmentId) ? departmentId : null;
    } else if (targetAudience && (targetAudience.startsWith('dept:') || targetAudience.startsWith('department:'))) {
      const parsedId = targetAudience.split(':')[1];
      newDeptId = parsedId && UUID_REGEX.test(parsedId) ? parsedId : null;
    }

    const rows = await prisma.$queryRawUnsafe(
      `
      UPDATE "CalendarEvent"
      SET
        "title" = $1,
        "description" = $2,
        "type" = $3,
        "startDate" = $4::timestamp,
        "endDate" = $5::timestamp,
        "allDay" = $6,
        "location" = $7,
        "targetAudience" = $8,
        "departmentId" = $9::uuid,
        "color" = $10,
        "updatedAt" = NOW()
      WHERE "id" = $11::uuid AND "collegeId" = $12::uuid
      RETURNING *
      `,
      newTitle,
      newDesc,
      newType,
      newStart,
      newEnd,
      newAllDay,
      newLoc,
      newAudience,
      newDeptId,
      newColor,
      id,
      collegeId
    );

    const updatedEvent = rows[0];

    // Send in-app notification on calendar event update to the assigned target role(s)
    sendCalendarNotification({
      collegeId,
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
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;

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
      await prisma.exam.delete({
        where: { id: realId }
      });
      return res.json({ success: true, message: 'Exam deleted successfully' });
    }

    if (!UUID_REGEX.test(String(id))) {
      return res.status(404).json({ success: false, error: 'Calendar event not found' });
    }

    const result = await prisma.$executeRawUnsafe(
      `DELETE FROM "CalendarEvent" WHERE "id" = $1::uuid AND "collegeId" = $2::uuid`,
      id,
      collegeId
    );

    if (result === 0) {
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

    if (!userContext.canManage) {
      const role = String(userContext.role || '').toLowerCase();
      const userDeptId = userContext.departmentId;
      const isStudent = role === 'student';
      const isTeacher = role === 'teacher' || role === 'faculty';
      const isStaff = role === 'staff';

      let pIdxToday = 4;
      const visToday = [
        `(LOWER("targetAudience") = 'everyone' OR LOWER("targetAudience") = 'all' OR "targetAudience" IS NULL OR "targetAudience" = '')`
      ];

      let pIdxUpcoming = 3;
      const visUpcoming = [
        `(LOWER("targetAudience") = 'everyone' OR LOWER("targetAudience") = 'all' OR "targetAudience" IS NULL OR "targetAudience" = '')`
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
      } else if (isStaff) {
        if (userDeptId && UUID_REGEX.test(userDeptId)) {
          visToday.push(`(LOWER("targetAudience") = 'staff' AND ("departmentId" IS NULL OR "departmentId" = $${pIdxToday}::uuid))`);
          todayParams.push(userDeptId);
          pIdxToday++;

          visUpcoming.push(`(LOWER("targetAudience") = 'staff' AND ("departmentId" IS NULL OR "departmentId" = $${pIdxUpcoming}::uuid))`);
          upcomingParams.push(userDeptId);
          pIdxUpcoming++;
        } else {
          visToday.push(`(LOWER("targetAudience") = 'staff' AND "departmentId" IS NULL)`);
          visUpcoming.push(`(LOWER("targetAudience") = 'staff' AND "departmentId" IS NULL)`);
        }
      }

      if (userDeptId && UUID_REGEX.test(userDeptId)) {
        visToday.push(`"departmentId" = $${pIdxToday}::uuid`);
        visToday.push(`LOWER("targetAudience") = $${pIdxToday + 1}`);
        visToday.push(`LOWER("targetAudience") = $${pIdxToday + 2}`);
        todayParams.push(userDeptId, `dept:${userDeptId.toLowerCase()}`, `department:${userDeptId.toLowerCase()}`);
        pIdxToday += 3;

        visUpcoming.push(`"departmentId" = $${pIdxUpcoming}::uuid`);
        visUpcoming.push(`LOWER("targetAudience") = $${pIdxUpcoming + 1}`);
        visUpcoming.push(`LOWER("targetAudience") = $${pIdxUpcoming + 2}`);
        upcomingParams.push(userDeptId, `dept:${userDeptId.toLowerCase()}`, `department:${userDeptId.toLowerCase()}`);
        pIdxUpcoming += 3;
      }

      todayQuery += ` AND (${visToday.join(' OR ')})`;
      upcomingQuery += ` AND (${visUpcoming.join(' OR ')})`;
    }

    upcomingQuery += ` ORDER BY "startDate" ASC LIMIT 5`;

    const todayEvents = await prisma.$queryRawUnsafe(todayQuery, ...todayParams).catch(() => [{ count: 0 }]);
    const upcomingEvents = await prisma.$queryRawUnsafe(upcomingQuery, ...upcomingParams).catch(() => []);

    const examWhere = {
      collegeId,
      date: { gte: new Date(todayStart) }
    };

    if (!userContext.canManage) {
      if (userContext.role === 'staff') {
        if (userContext.departmentId) {
          examWhere.course = { departmentId: userContext.departmentId };
        } else {
          examWhere.id = '__none__';
        }
      } else if (userContext.departmentId) {
        examWhere.OR = [
          { course: { departmentId: userContext.departmentId } },
          { course: { departmentId: null } }
        ];
      }
    }

    const examsCount = await prisma.exam.count({ where: examWhere }).catch(() => 0);

    return res.json({
      success: true,
      data: {
        todayCount: todayEvents[0]?.count || 0,
        upcomingExamsCount: examsCount,
        upcomingEvents,
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


