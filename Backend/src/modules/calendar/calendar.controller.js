import { prisma } from '../../lib/prisma.js';

let tableInitialized = false;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Automatically ensures the CalendarEvent table exists in PostgreSQL.
 * Executes DDL statements separately to prevent multi-statement prepared query errors in Postgres.
 */
async function ensureCalendarTable() {
  if (tableInitialized) return;
  try {
    await prisma.$executeRawUnsafe(`
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
      )
    `);

    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "idx_cal_event_college" ON "CalendarEvent"("collegeId")
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "idx_cal_event_date" ON "CalendarEvent"("startDate")
      `);
    } catch (_) {
      // Index creation can be safely skipped if already created or on concurrency
    }

    tableInitialized = true;
  } catch (err) {
    console.error('[Calendar] Error ensuring CalendarEvent table:', err.message);
  }
}

/**
 * Role check helper: Only ADMIN and HOD can access / manage calendar.
 */
export function canManageCalendar(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  return role === 'admin' || role === 'hod' || role === 'superadmin' || Boolean(user.isHod);
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
      canManage: canManageCalendar(req.user)
    });
  }

  const { month, year, startDate, endDate, type, search, targetAudience } = req.query;

  try {
    // 1. Fetch from CalendarEvent table
    let query = `SELECT * FROM "CalendarEvent" WHERE "collegeId" = $1::uuid`;
    const params = [collegeId];
    let paramIndex = 2;

    if (type && type !== 'all') {
      query += ` AND LOWER("type") = $${paramIndex}`;
      params.push(type.toLowerCase());
      paramIndex++;
    }

    if (targetAudience && targetAudience !== 'all') {
      const audLower = targetAudience.toLowerCase().trim();
      if (audLower === 'everyone') {
        query += ` AND (LOWER("targetAudience") = 'everyone' OR LOWER("targetAudience") = 'all')`;
      } else {
        query += ` AND (LOWER("targetAudience") = $${paramIndex} OR LOWER("targetAudience") = 'everyone' OR LOWER("targetAudience") = 'all'`;
        if (audLower === 'teachers' || audLower === 'teacher') {
          query += ` OR LOWER("targetAudience") = 'teacher' OR LOWER("targetAudience") = 'teachers' OR LOWER("targetAudience") = 'faculty'`;
        } else if (audLower === 'students' || audLower === 'student') {
          query += ` OR LOWER("targetAudience") = 'student' OR LOWER("targetAudience") = 'students'`;
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

    const customEvents = await prisma.$queryRawUnsafe(query, ...params).catch((e) => {
      console.warn('[Calendar] Query fallback:', e.message);
      return [];
    });

    // 2. Fetch existing Exams from the Exam model to automatically display in calendar
    let examEvents = [];
    if (!type || type === 'all' || type.toLowerCase() === 'exam') {
      try {
        const exams = await prisma.exam.findMany({
          where: { collegeId },
          include: {
            course: {
              select: { name: true, code: true }
            }
          },
          orderBy: { date: 'asc' }
        });

        examEvents = (exams || []).map((exam) => ({
          id: `exam-${exam.id}`,
          originalExamId: exam.id,
          collegeId: exam.collegeId,
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
      canManage: canManageCalendar(req.user)
    });
  } catch (err) {
    console.error('[Calendar] Error fetching events:', err);
    return res.json({
      success: true,
      count: 0,
      data: [],
      canManage: canManageCalendar(req.user)
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

  try {
    if (id.startsWith('exam-')) {
      const realId = id.replace('exam-', '');
      const exam = await prisma.exam.findFirst({
        where: { id: realId, collegeId },
        include: { course: true }
      });
      if (!exam) return res.status(404).json({ success: false, error: 'Exam not found' });
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

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/v1/calendar/events
 */
export const createCalendarEvent = async (req, res) => {
  if (!canManageCalendar(req.user)) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Only ADMIN and HOD can create calendar events or exams.'
    });
  }

  await ensureCalendarTable();

  const collegeId = req.tenant?.collegeId || req.body.collegeId || req.user?.collegeId;
  if (!collegeId || !UUID_REGEX.test(String(collegeId))) {
    return res.status(400).json({ success: false, error: 'Valid College ID is required' });
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

    const rows = await prisma.$queryRawUnsafe(
      `
      INSERT INTO "CalendarEvent" (
        "collegeId", "title", "description", "type",
        "startDate", "endDate", "allDay", "location",
        "targetAudience", "departmentId", "createdById",
        "createdByName", "createdByRole", "color"
      ) VALUES (
        $1::uuid, $2, $3, $4,
        $5::timestamp, $6::timestamp, $7, $8,
        $9, $10::uuid, $11::uuid,
        $12, $13, $14
      )
      RETURNING *
      `,
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
      req.user?.name || req.user?.email || 'Admin',
      req.user?.role || 'admin',
      assignedColor
    );

    const createdEvent = rows[0];

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
  if (!canManageCalendar(req.user)) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Only ADMIN and HOD can edit calendar events and exams.'
    });
  }

  await ensureCalendarTable();

  const { id } = req.params;
  const collegeId = req.tenant?.collegeId || req.body.collegeId || req.user?.collegeId;

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
  if (!canManageCalendar(req.user)) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Only ADMIN and HOD can delete calendar events and exams.'
    });
  }

  await ensureCalendarTable();

  const { id } = req.params;
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;

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
        canManage: canManageCalendar(req.user)
      }
    });
  }

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

    const todayEvents = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int as count FROM "CalendarEvent" WHERE "collegeId" = $1::uuid AND "startDate" >= $2::timestamp AND "startDate" <= $3::timestamp`,
      collegeId,
      todayStart,
      todayEnd
    ).catch(() => [{ count: 0 }]);

    const upcomingEvents = await prisma.$queryRawUnsafe(
      `SELECT * FROM "CalendarEvent" WHERE "collegeId" = $1::uuid AND "startDate" >= $2::timestamp ORDER BY "startDate" ASC LIMIT 5`,
      collegeId,
      todayStart
    ).catch(() => []);

    const examsCount = await prisma.exam.count({
      where: {
        collegeId,
        date: { gte: new Date(todayStart) }
      }
    }).catch(() => 0);

    return res.json({
      success: true,
      data: {
        todayCount: todayEvents[0]?.count || 0,
        upcomingExamsCount: examsCount,
        upcomingEvents,
        canManage: canManageCalendar(req.user)
      }
    });
  } catch (err) {
    return res.json({
      success: true,
      data: {
        todayCount: 0,
        upcomingExamsCount: 0,
        upcomingEvents: [],
        canManage: canManageCalendar(req.user)
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
  if (!canManageCalendar(req.user)) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Only ADMIN and HOD can configure Saturday holidays.'
    });
  }

  await ensureCalendarTable();

  const collegeId = req.tenant?.collegeId || req.body.collegeId || req.user?.collegeId;
  if (!collegeId || !UUID_REGEX.test(String(collegeId))) {
    return res.status(400).json({ success: false, error: 'Valid College ID is required' });
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

        const created = await prisma.$queryRawUnsafe(
          `INSERT INTO "CalendarEvent" (
            "collegeId", "title", "description", "type",
            "startDate", "endDate", "allDay", "location",
            "targetAudience", "createdById", "createdByName", "createdByRole", "color"
          ) VALUES (
            $1::uuid, $2, $3, 'holiday',
            $4::timestamp, $5::timestamp, true, 'Campus-wide',
            'all', $6::uuid, $7, $8, '#10b981'
          ) RETURNING *`,
          collegeId,
          label,
          `Official Saturday holiday (${label}) configured by Admin/HOD.`,
          sDate,
          eDate,
          req.user?.id && UUID_REGEX.test(req.user.id) ? req.user.id : null,
          req.user?.name || req.user?.email || 'Admin',
          req.user?.role || 'admin'
        );
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

