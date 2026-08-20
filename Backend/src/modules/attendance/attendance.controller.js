import { prisma, logger } from '../../server.js';
import { redis } from '../../lib/cache.js';
import { markAttendanceSchema } from './attendance.schema.js';

export const markAttendance = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const { studentId, courseId, date, status, classEndTime } = markAttendanceSchema.parse(req.body);
    const teacherId = req.user.userId;

    let isLateEntry = false;
    if (classEndTime) {
      const end = new Date(classEndTime);
      const now = new Date();
      // "a submission is 'late' if marked_at - class_end_time > 30 minutes"
      if (now.getTime() - end.getTime() > 30 * 60 * 1000) {
        isLateEntry = true;
      }
    }

    const attendanceRecord = await prisma.attendance.create({
      data: {
        collegeId,
        studentId,
        courseId,
        teacherId,
        date: new Date(date),
        status,
        isLateEntry,
        markedAt: new Date()
      }
    });

    // Recalculate synchronous percentage
    const allRecords = await prisma.attendance.findMany({
      where: { collegeId, studentId, courseId }
    });

    const totalClasses = allRecords.length;
    const presentClasses = allRecords.filter(r => r.status === 'present' || r.status === 'late').length;
    const percentage = (presentClasses / totalClasses) * 100;

    // Cache invalidation
    await redis.del(`attendance_percent:${collegeId}:${studentId}:${courseId}`);

    // If drops below 75%, trigger alert (pseudo-code enqueue)
    if (percentage < 75) {
      logger.info(`Low attendance alert! Student ${studentId} is at ${percentage.toFixed(2)}%`);
      // Here you would push to a queue for SMS/email, e.g., await queue.add('sendLowAttendanceSms', { studentId })
    }

    res.status(201).json({ 
      data: attendanceRecord, 
      meta: { currentPercentage: percentage.toFixed(2) } 
    });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};

export const getDailyAttendance = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const { courseId, date } = req.params;

    // We only want the date portion
    const searchDate = new Date(date);
    searchDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(searchDate);
    nextDate.setDate(searchDate.getDate() + 1);

    const records = await prisma.attendance.findMany({
      where: {
        collegeId,
        courseId,
        date: {
          gte: searchDate,
          lt: nextDate
        }
      }
    });

    // Format for frontend: { [studentId]: 'present' }
    const formattedRecords = {};
    records.forEach(r => {
      formattedRecords[r.studentId] = r.status;
    });

    res.json({ data: formattedRecords });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};
