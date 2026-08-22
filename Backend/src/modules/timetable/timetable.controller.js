import { prisma, logger } from '../../server.js';
import { createTimetableSlotSchema, updateTimetableSlotSchema } from './timetable.schema.js';

const DAY_MAP_TO_NAME = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  0: 'Sunday'
};

const DAY_NAME_TO_INT = {
  'Monday': 1,
  'Tuesday': 2,
  'Wednesday': 3,
  'Thursday': 4,
  'Friday': 5,
  'Saturday': 6,
  'Sunday': 0
};

// Helper to ensure dummy/default foreign keys if not provided
async function ensureDefaultAcademicEntities(collegeId) {
  let dept = await prisma.department.findFirst({ where: { collegeId } });
  if (!dept) {
    dept = await prisma.department.create({
      data: {
        collegeId,
        name: 'General Academics',
        code: 'GEN'
      }
    });
  }

  let course = await prisma.course.findFirst({ where: { collegeId } });
  if (!course) {
    course = await prisma.course.create({
      data: {
        collegeId,
        departmentId: dept.id,
        name: 'General Engineering',
        code: 'ENG101',
        semester: 1,
        credits: 4
      }
    });
  }

  let section = await prisma.section.findFirst({ where: { collegeId } });
  if (!section) {
    section = await prisma.section.create({
      data: {
        collegeId,
        courseId: course.id,
        name: 'Section A',
        capacity: 60
      }
    });
  }

  let teacher = await prisma.teacher.findFirst({ where: { collegeId } });
  if (!teacher) {
    let teacherUser = await prisma.user.findFirst({ where: { collegeId, role: 'teacher' } });
    if (!teacherUser) {
      teacherUser = await prisma.user.create({
        data: {
          collegeId,
          email: `faculty_${Date.now()}@college.edu`,
          role: 'teacher',
          passwordHash: 'hash123'
        }
      });
    }

    teacher = await prisma.teacher.create({
      data: {
        collegeId,
        userId: teacherUser.id,
        departmentId: dept.id,
        designation: 'Assistant Professor',
        joiningDate: new Date()
      }
    });
  }

  return { deptId: dept.id, courseId: course.id, sectionId: section.id, teacherId: teacher.id };
}

export const getTimetable = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const userId = req.user?.id || req.user?.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { teacherProfile: true }
  });

  const where = { collegeId };

  if (user?.role === 'teacher' || user?.role === 'hod') {
    if (user.teacherProfile) {
      where.teacherId = user.teacherProfile.id;
    }
  }

  const slots = await prisma.timetableSlot.findMany({
    where,
    include: {
      course: true,
      teacher: { include: { user: true } },
      section: true
    },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
  });

  const formatted = slots.map(slot => {
    const dayName = typeof slot.dayOfWeek === 'number' ? DAY_MAP_TO_NAME[slot.dayOfWeek] || 'Monday' : slot.dayOfWeek;
    const teacherFullName = slot.teacher?.user 
      ? `${slot.teacher.user.firstName || ''} ${slot.teacher.user.lastName || ''}`.trim() || slot.teacher.user.email
      : 'Faculty Member';

    return {
      id: slot.id,
      subject: slot.course?.name || 'Class Session',
      courseName: slot.course?.name || 'Academic Course',
      courseId: slot.courseId,
      teacherName: teacherFullName,
      teacherId: slot.teacherId,
      dayOfWeek: dayName,
      startTime: slot.startTime || '09:00',
      endTime: slot.endTime || '10:00',
      room: slot.room || 'Room 101',
      status: 'approved',
    };
  });

  res.json({
    success: true,
    data: formatted
  });
};

export const scheduleSlot = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const payload = createTimetableSlotSchema.parse(req.body);

  const defaults = await ensureDefaultAcademicEntities(collegeId);

  const dayInt = typeof payload.dayOfWeek === 'string'
    ? (DAY_NAME_TO_INT[payload.dayOfWeek] !== undefined ? DAY_NAME_TO_INT[payload.dayOfWeek] : 1)
    : Number(payload.dayOfWeek);

  // If a specific course with name was requested, find or create
  let targetCourseId = payload.courseId || defaults.courseId;
  if (!payload.courseId && payload.subject) {
    let existingCourse = await prisma.course.findFirst({
      where: { collegeId, name: payload.subject }
    });
    if (!existingCourse) {
      existingCourse = await prisma.course.create({
        data: {
          collegeId,
          departmentId: defaults.deptId,
          name: payload.subject,
          code: `SUB-${Math.floor(100 + Math.random() * 900)}`,
          semester: 1,
          credits: 3
        }
      });
    }
    targetCourseId = existingCourse.id;
  }

  const slot = await prisma.timetableSlot.create({
    data: {
      collegeId,
      departmentId: defaults.deptId,
      courseId: targetCourseId,
      sectionId: defaults.sectionId,
      teacherId: payload.teacherId || defaults.teacherId,
      dayOfWeek: dayInt,
      startTime: payload.startTime,
      endTime: payload.endTime,
      room: payload.room
    },
    include: {
      course: true,
      teacher: { include: { user: true } }
    }
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} slotId=${slot.id} actor=${actorId} Scheduled class '${payload.subject}' on ${payload.dayOfWeek}`);
  
  res.status(201).json({
    success: true,
    data: {
      id: slot.id,
      subject: slot.course?.name || payload.subject,
      courseName: slot.course?.name || payload.courseName,
      teacherName: payload.teacherName,
      dayOfWeek: payload.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      room: slot.room,
      status: 'approved'
    }
  });
};

export const updateSlot = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { id } = req.params;
  const payload = updateTimetableSlotSchema.parse(req.body);

  const existing = await prisma.timetableSlot.findFirst({
    where: { id, collegeId }
  });

  if (!existing) {
    return res.status(404).json({ success: false, error: { code: 'SLOT_NOT_FOUND', message: 'Timetable slot not found' } });
  }

  const updateData = {};
  if (payload.startTime) updateData.startTime = payload.startTime;
  if (payload.endTime) updateData.endTime = payload.endTime;
  if (payload.room) updateData.room = payload.room;
  if (payload.dayOfWeek !== undefined) {
    updateData.dayOfWeek = typeof payload.dayOfWeek === 'string'
      ? (DAY_NAME_TO_INT[payload.dayOfWeek] !== undefined ? DAY_NAME_TO_INT[payload.dayOfWeek] : 1)
      : Number(payload.dayOfWeek);
  }

  const updated = await prisma.timetableSlot.update({
    where: { id },
    data: updateData,
    include: { course: true, teacher: { include: { user: true } } }
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} slotId=${id} actor=${actorId} Updated timetable slot`);
  res.json({ success: true, data: updated });
};

export const deleteSlot = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { id } = req.params;

  const existing = await prisma.timetableSlot.findFirst({
    where: { id, collegeId }
  });

  if (!existing) {
    return res.status(404).json({ success: false, error: { code: 'SLOT_NOT_FOUND', message: 'Timetable slot not found' } });
  }

  await prisma.timetableSlot.delete({ where: { id } });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} slotId=${id} actor=${actorId} Deleted timetable slot`);
  res.json({ success: true, message: 'Class schedule removed successfully' });
};

export const getTodayTimetable = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const userId = req.user?.id || req.user?.userId;
  
  // Find teacher profile for the current user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { teacherProfile: true }
  });

  if (!user || !user.teacherProfile) {
    return res.json({ success: true, data: [] });
  }

  const todayInt = new Date().getDay();
  const dayName = DAY_MAP_TO_NAME[todayInt];

  const slots = await prisma.timetableSlot.findMany({
    where: { 
      collegeId, 
      teacherId: user.teacherProfile.id,
      dayOfWeek: dayName
    },
    include: {
      course: true,
      section: true
    },
    orderBy: {
      startTime: 'asc'
    }
  });

  // Map to frontend expected format
  const formattedSlots = slots.map(slot => ({
    id: slot.id,
    subject: slot.subject || slot.course?.name || 'Subject',
    class: `${slot.course?.name || ''} - ${slot.section?.name || ''}`,
    time: `${slot.startTime} - ${slot.endTime}`,
    room: slot.room || 'TBA',
    type: slot.type || 'Lecture',
    status: 'upcoming' // Mock status
  }));

  res.json({ success: true, data: formattedSlots });
};
