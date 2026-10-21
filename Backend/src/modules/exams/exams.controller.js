import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { createExamSchema, updateExamSchema, enterMarksSchema, batchEnterMarksSchema } from './exams.schema.js';
import { notify } from '../notifications/notify.service.js';

// Helper to ensure dummy/default course if needed
async function ensureDefaultCourse(collegeId, courseName, departmentId = null) {
  let dept = null;
  if (departmentId) {
    dept = await prisma.department.findFirst({ where: { id: departmentId, collegeId } });
  }
  if (!dept) {
    dept = await prisma.department.findFirst({ where: { collegeId } });
  }
  if (!dept) {
    dept = await prisma.department.create({
      data: { collegeId, name: 'General Department', code: 'GEN' }
    });
  }

  let course = null;
  if (courseName) {
    course = await prisma.course.findFirst({ 
      where: { 
        collegeId, 
        name: courseName,
        ...(dept ? { departmentId: dept.id } : {})
      } 
    });
  }

  if (!course && dept) {
    course = await prisma.course.findFirst({ where: { collegeId, departmentId: dept.id } });
  }

  if (!course) {
    course = await prisma.course.findFirst({ where: { collegeId } });
  }

  if (!course) {
    course = await prisma.course.create({
      data: {
        collegeId,
        departmentId: dept.id,
        name: courseName || `${dept.name} Exam Program`,
        code: `${dept.code || 'CRS'}-${Math.floor(100 + Math.random() * 900)}`,
        semester: 1,
        credits: 3
      }
    });
  }

  return course.id;
}

export const normalizeHall = (rawHall) => {
  if (!rawHall) return '';
  let h = String(rawHall).trim().toLowerCase();
  h = h.replace(/^(?:hall|room)\s*(?:no\.?|number|-|:)?\s*/i, '').trim();
  return h;
};

export const normalizeTime = (t) => {
  if (!t || typeof t !== 'string') return null;
  const match = t.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
};

export const formatDateDisplay = (d) => {
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return String(d);
  }
};

export async function checkHallConflict(collegeId, { date, room, startTime, endTime, excludeId = null }) {
  if (!room || !String(room).trim()) return null;

  const targetNormHall = normalizeHall(room);
  if (!targetNormHall) return null;

  const targetDateObj = new Date(date);
  if (isNaN(targetDateObj.getTime())) return null;
  const targetDateStr = targetDateObj.toISOString().split('T')[0];

  const newStart = normalizeTime(startTime);
  const newEnd = normalizeTime(endTime);

  const existingExams = await prisma.exam.findMany({
    where: {
      collegeId,
      ...(excludeId ? { id: { not: excludeId } } : {})
    },
    select: {
      id: true,
      name: true,
      date: true,
      room: true,
      startTime: true,
      endTime: true,
      status: true,
    }
  });

  for (const ex of existingExams) {
    if (ex.status?.toLowerCase() === 'cancelled') continue;

    const exDateStr = ex.date ? new Date(ex.date).toISOString().split('T')[0] : '';
    if (exDateStr !== targetDateStr) continue;

    const exNormHall = normalizeHall(ex.room);
    if (!exNormHall || exNormHall !== targetNormHall) continue;

    const exStart = normalizeTime(ex.startTime);
    const exEnd = normalizeTime(ex.endTime);

    let isConflict = false;
    if (!newStart || !newEnd || !exStart || !exEnd) {
      isConflict = true;
    } else if (newStart < exEnd && newEnd > exStart) {
      isConflict = true;
    }

    if (isConflict) {
      const timePart = exStart && exEnd ? ` from ${exStart} to ${exEnd}` : '';
      const rawTrimmed = String(room).trim();
      const hallDisplay = /hall/i.test(rawTrimmed) ? rawTrimmed : `Hall ${rawTrimmed}`;
      return `${hallDisplay} is already booked on ${formatDateDisplay(ex.date)}${timePart} for ${ex.name}. Choose another hall or time.`;
    }
  }

  return null;
}

export const getExams = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const { courseId } = req.query;

  const where = { collegeId };
  if (courseId && courseId !== 'ALL') {
    where.courseId = courseId;
  }

  const exams = await prisma.exam.findMany({
    where,
    include: {
      course: {
        include: { department: true }
      },
      marks: {
        include: {
          student: {
            include: { user: true }
          }
        }
      }
    },
    orderBy: { date: 'desc' }
  });

  const formatted = exams.map(exam => {
    const totalStudentsAppeared = exam.marks.length;
    const avgScore = totalStudentsAppeared > 0
      ? (exam.marks.reduce((acc, m) => acc + m.obtainedMarks, 0) / totalStudentsAppeared).toFixed(1)
      : '0.0';

    return {
      id: exam.id,
      title: exam.name,
      name: exam.name,
      subject: exam.course?.name || exam.name,
      courseName: exam.course?.name || 'General Program',
      courseCode: exam.course?.code || null,
      courseId: exam.courseId,
      departmentId: exam.course?.departmentId || null,
      departmentName: exam.course?.department?.name || 'General',
      departmentCode: exam.course?.department?.code || null,
      date: exam.date ? new Date(exam.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      maxMarks: exam.maxMarks,
      type: exam.type || 'Midterm',
      status: exam.status || 'active',
      room: exam.room || 'Main Hall',
      startTime: exam.startTime || null,
      endTime: exam.endTime || null,
      totalStudentsAppeared,
      averageScore: avgScore,
      marks: exam.marks.map(m => ({
        id: m.id,
        studentId: m.studentId,
        studentName: m.student?.user?.name || m.student?.user?.email || 'Student',
        rollNumber: m.student?.rollNumber || m.student?.admissionNumber || 'N/A',
        obtainedMarks: m.obtainedMarks,
        remarks: m.remarks
      }))
    };
  });

  res.json({
    success: true,
    data: formatted
  });
};

export const createExam = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const payload = createExamSchema.parse(req.body);

  const hallConflict = await checkHallConflict(collegeId, {
    date: payload.date || new Date(),
    room: payload.room,
    startTime: payload.startTime,
    endTime: payload.endTime
  });

  if (hallConflict) {
    return res.status(409).json({
      success: false,
      error: {
        code: 'HALL_CONFLICT',
        message: hallConflict
      }
    });
  }

  let targetCourseId = null;
  if (payload.courseId) {
    const course = await prisma.course.findFirst({
      where: {
        id: payload.courseId,
        collegeId
      }
    });

    if (!course) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_COURSE',
          message: 'Course not found or does not belong to this college'
        }
      });
    }

    targetCourseId = course.id;
  } else {
    targetCourseId = await ensureDefaultCourse(collegeId, payload.courseName || payload.subject, payload.departmentId);
  }

  const exam = await prisma.exam.create({
    data: {
      collegeId,
      courseId: targetCourseId,
      name: payload.name || payload.subject || 'Examination',
      date: payload.date ? new Date(payload.date) : new Date(),
      maxMarks: Number(payload.maxMarks) || 100,
      type: payload.type || 'Midterm',
      status: payload.status || 'pending',
      room: payload.room ? String(payload.room).trim() : 'Main Hall',
      startTime: payload.startTime || null,
      endTime: payload.endTime || null,
    },
    include: { 
      course: {
        include: { department: true }
      } 
    }
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} examId=${exam.id} actor=${actorId} Scheduled exam '${exam.name}'`);

  // Notify students enrolled in this course or department
  try {
    const students = await prisma.student.findMany({
      where: {
        collegeId,
        deletedAt: null,
        userId: { not: null },
        OR: [
          { courseId: targetCourseId },
          { section: { courseId: targetCourseId } },
          { enrollments: { some: { courseId: targetCourseId } } }
        ]
      },
      select: { userId: true }
    });
    let recipientUserIds = [...new Set(students.map(s => s.userId).filter(Boolean))];

    // Fallback: if no direct course students found, check department students
    if (recipientUserIds.length === 0 && exam.course?.departmentId) {
      const deptStudents = await prisma.student.findMany({
        where: {
          collegeId,
          departmentId: exam.course.departmentId,
          deletedAt: null,
          userId: { not: null }
        },
        select: { userId: true }
      });
      recipientUserIds = [...new Set(deptStudents.map(s => s.userId).filter(Boolean))];
    }

    if (recipientUserIds.length > 0) {
      const examDateStr = exam.date ? new Date(exam.date).toISOString().split('T')[0] : '';
      await notify({
        collegeId,
        target: { userIds: recipientUserIds },
        title: 'New Exam Scheduled',
        message: `Exam '${exam.name}' for ${exam.course?.name || 'your course'} has been scheduled on ${examDateStr}.`,
        type: 'exam_scheduled',
        link: '/student/exams',
      });
      logger.info(`[Exams] Notified ${recipientUserIds.length} students for new exam ${exam.id}`);
    }
  } catch (notifErr) {
    logger.error(`[Exams] Notification error: ${notifErr.message}`);
  }
  
  res.status(201).json({
    success: true,
    data: {
      id: exam.id,
      title: exam.name,
      name: exam.name,
      subject: exam.course?.name || exam.name,
      courseName: exam.course?.name || 'General Program',
      courseId: exam.courseId,
      departmentName: exam.course?.department?.name || 'General',
      departmentCode: exam.course?.department?.code || null,
      date: exam.date.toISOString().split('T')[0],
      maxMarks: exam.maxMarks,
      type: exam.type,
      status: exam.status,
      room: exam.room || payload.room || 'Main Hall',
      startTime: exam.startTime || payload.startTime || null,
      endTime: exam.endTime || payload.endTime || null,
    }
  });
};

export const updateExam = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { id } = req.params;
  const payload = updateExamSchema.parse(req.body);

  const existing = await prisma.exam.findFirst({
    where: { id, collegeId },
    include: {
      course: {
        include: { department: true }
      }
    }
  });

  if (!existing) {
    return res.status(404).json({ success: false, error: { code: 'EXAM_NOT_FOUND', message: 'Exam not found' } });
  }

  const effectiveDate = payload.date !== undefined ? payload.date : existing.date;
  const effectiveRoom = payload.room !== undefined ? payload.room : existing.room;
  const effectiveStartTime = payload.startTime !== undefined ? payload.startTime : existing.startTime;
  const effectiveEndTime = payload.endTime !== undefined ? payload.endTime : existing.endTime;

  const hallConflict = await checkHallConflict(collegeId, {
    date: effectiveDate,
    room: effectiveRoom,
    startTime: effectiveStartTime,
    endTime: effectiveEndTime,
    excludeId: id,
  });

  if (hallConflict) {
    return res.status(409).json({
      success: false,
      error: {
        code: 'HALL_CONFLICT',
        message: hallConflict
      }
    });
  }

  const oldDateStr = existing.date ? new Date(existing.date).toISOString().split('T')[0] : null;
  const newDateStr = payload.date ? new Date(payload.date).toISOString().split('T')[0] : null;
  const isDateChanged = Boolean(newDateStr && oldDateStr && newDateStr !== oldDateStr);

  const todayISTStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const isPastDate = Boolean(newDateStr && newDateStr < todayISTStr);

  const updateData = {};
  if (payload.courseId) {
    const course = await prisma.course.findFirst({
      where: {
        id: payload.courseId,
        collegeId
      }
    });

    if (!course) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_COURSE',
          message: 'Course not found or does not belong to this college'
        }
      });
    }

    updateData.courseId = course.id;
  }
  if (payload.name) updateData.name = payload.name;
  if (payload.maxMarks !== undefined) updateData.maxMarks = Number(payload.maxMarks);
  if (payload.type) updateData.type = payload.type;
  if (payload.status) updateData.status = payload.status;
  if (payload.date) updateData.date = new Date(payload.date);
  if (payload.room !== undefined) updateData.room = payload.room ? String(payload.room).trim() : 'Main Hall';
  if (payload.startTime !== undefined) updateData.startTime = payload.startTime || null;
  if (payload.endTime !== undefined) updateData.endTime = payload.endTime || null;

  const updated = await prisma.exam.update({
    where: { id },
    data: updateData,
    include: {
      course: {
        include: { department: true }
      }
    }
  });

  // Notify students if exam date was rescheduled to a current or future date
  if (isDateChanged && !isPastDate) {
    try {
      const targetCourseId = updated.courseId || existing.courseId;
      const students = await prisma.student.findMany({
        where: {
          collegeId,
          deletedAt: null,
          userId: { not: null },
          OR: [
            { courseId: targetCourseId },
            { section: { courseId: targetCourseId } },
            { enrollments: { some: { courseId: targetCourseId } } }
          ]
        },
        select: { userId: true }
      });
      let recipientUserIds = [...new Set(students.map(s => s.userId).filter(Boolean))];

      // Fallback: if no direct course students found, check department students
      const deptId = updated.course?.departmentId || existing.course?.departmentId;
      if (recipientUserIds.length === 0 && deptId) {
        const deptStudents = await prisma.student.findMany({
          where: {
            collegeId,
            departmentId: deptId,
            deletedAt: null,
            userId: { not: null }
          },
          select: { userId: true }
        });
        recipientUserIds = [...new Set(deptStudents.map(s => s.userId).filter(Boolean))];
      }

      if (recipientUserIds.length > 0) {
        const formatISTDate = (d) => {
          if (!d) return '';
          return new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Kolkata',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          }).format(new Date(d));
        };

        const oldDateFormatted = formatISTDate(existing.date);
        let newDateFormatted = formatISTDate(updated.date);
        if (req.body?.startTime) {
          newDateFormatted += ` at ${req.body.startTime}`;
        }

        const courseOrSubject = updated.course?.name || existing.course?.name || updated.name;
        const subjectPart = courseOrSubject ? ` (${courseOrSubject})` : '';
        const message = `${updated.name}${subjectPart} has been rescheduled from ${oldDateFormatted} to ${newDateFormatted}.`;

        await notify({
          collegeId,
          target: { userIds: recipientUserIds },
          title: 'Exam Rescheduled',
          message,
          type: 'exam_scheduled',
          link: '/student/exams',
        });
        logger.info(`[Exams] Notified ${recipientUserIds.length} students for rescheduled exam ${updated.id}`);
      }
    } catch (notifErr) {
      logger.error(`[Exams] Reschedule notification error: ${notifErr.message}`);
    }
  }

  logger.info(`[info] req=${req.id || ''} college=${collegeId} examId=${id} actor=${actorId} Updated exam details`);
  res.json({
    success: true,
    data: {
      id: updated.id,
      title: updated.name,
      name: updated.name,
      subject: updated.course?.name || updated.name,
      courseName: updated.course?.name || 'General Program',
      courseId: updated.courseId,
      date: updated.date ? new Date(updated.date).toISOString().split('T')[0] : null,
      maxMarks: updated.maxMarks,
      type: updated.type,
      status: updated.status,
      room: updated.room,
      startTime: updated.startTime,
      endTime: updated.endTime,
    }
  });
};

export const deleteExam = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { id } = req.params;

  const existing = await prisma.exam.findFirst({
    where: { id, collegeId }
  });

  if (!existing) {
    return res.status(404).json({ success: false, error: { code: 'EXAM_NOT_FOUND', message: 'Exam not found' } });
  }

  await prisma.mark.deleteMany({ where: { examId: id } });
  await prisma.exam.delete({ where: { id } });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} examId=${id} actor=${actorId} Deleted exam`);
  res.json({ success: true, message: 'Exam deleted successfully' });
};

export const enterMarks = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const { studentId, examId, obtainedMarks, remarks } = enterMarksSchema.parse(req.body);
  const teacherId = req.user?.id || req.user?.userId;

  const exam = await prisma.exam.findFirst({
    where: { id: examId, collegeId }
  });

  if (!exam) {
    return res.status(404).json({ success: false, error: { code: 'EXAM_NOT_FOUND', message: 'Exam not found' } });
  }

  if (obtainedMarks > exam.maxMarks) {
    return res.status(422).json({
      success: false,
      error: { code: 'MAX_MARKS_EXCEEDED', message: `Marks cannot exceed maximum marks (${exam.maxMarks})` }
    });
  }

  const existingMark = await prisma.mark.findUnique({
    where: {
      examId_studentId: {
        examId,
        studentId
      }
    }
  });

  const shouldNotify = !existingMark || existingMark.obtainedMarks !== obtainedMarks;

  const markRecord = await prisma.mark.upsert({
    where: {
      examId_studentId: {
        examId,
        studentId
      }
    },
    update: {
      obtainedMarks,
      remarks,
      enteredByTeacherId: teacherId
    },
    create: {
      collegeId,
      studentId,
      examId,
      obtainedMarks,
      remarks,
      enteredByTeacherId: teacherId
    }
  });

  if (shouldNotify) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { userId: true }
    });
    if (student?.userId) {
      await notify({
        collegeId,
        target: { userId: student.userId },
        type: 'exam_marks',
        title: 'Exam Marks Published',
        message: `Your marks for ${exam.name || exam.type || 'Exam'} have been updated: ${obtainedMarks}/${exam.maxMarks}.`,
        link: '/student/exams'
      });
    }
  }

  res.status(201).json({ success: true, data: markRecord });
};

export const batchEnterMarks = async (req, res) => {
  const teacherId = req.user?.id || req.user?.userId;
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const { courseId, examType, maxMarks, records } = batchEnterMarksSchema.parse(req.body);

  // Find or create the exam
  let exam = await prisma.exam.findFirst({
    where: {
      collegeId,
      courseId,
      name: examType
    }
  });

  if (!exam) {
    exam = await prisma.exam.create({
      data: {
        name: examType,
        collegeId,
        courseId,
        maxMarks,
        type: examType,
        date: new Date()
      }
    });
  } else if (exam.maxMarks !== maxMarks) {
    exam = await prisma.exam.update({
      where: { id: exam.id },
      data: { maxMarks }
    });
  }

  const studentIds = records.map(r => r.studentId);
  const [existingMarks, students] = await Promise.all([
    prisma.mark.findMany({
      where: {
        examId: exam.id,
        studentId: { in: studentIds }
      },
      select: { studentId: true, obtainedMarks: true }
    }),
    prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, userId: true }
    })
  ]);

  const existingMarksMap = new Map(existingMarks.map(m => [m.studentId, m.obtainedMarks]));
  const studentUserMap = new Map(students.map(s => [s.id, s.userId]));

  const results = [];
  for (const record of records) {
    if (record.obtainedMarks > exam.maxMarks) {
      continue; // Skip invalid marks
    }

    const prevMarks = existingMarksMap.get(record.studentId);
    const shouldNotify = prevMarks === undefined || prevMarks !== record.obtainedMarks;

    const markRecord = await prisma.mark.upsert({
      where: {
        examId_studentId: {
          examId: exam.id,
          studentId: record.studentId
        }
      },
      update: {
        obtainedMarks: record.obtainedMarks,
        enteredByTeacherId: teacherId
      },
      create: {
        collegeId,
        studentId: record.studentId,
        examId: exam.id,
        obtainedMarks: record.obtainedMarks,
        enteredByTeacherId: teacherId
      }
    });
    results.push(markRecord);

    const studentUserId = studentUserMap.get(record.studentId);
    if (shouldNotify && studentUserId) {
      await notify({
        collegeId,
        target: { userId: studentUserId },
        type: 'exam_marks',
        title: 'Exam Marks Published',
        message: `Your marks for ${exam.name || exam.type || 'Exam'} have been updated: ${record.obtainedMarks}/${exam.maxMarks}.`,
        link: '/student/exams'
      });
    }
  }

  res.json({ success: true, count: results.length });
};

export const getExamResults = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const { id: examId } = req.params;

  const marks = await prisma.mark.findMany({
    where: { examId, collegeId },
    include: {
      student: {
        include: { user: true }
      },
      exam: true
    }
  });

  const formatted = marks.map(m => ({
    id: m.id,
    studentId: m.studentId,
    studentName: m.student?.user?.name || m.student?.user?.email || 'Student',
    rollNumber: m.student?.rollNumber || m.student?.admissionNumber || 'N/A',
    obtainedMarks: m.obtainedMarks,
    maxMarks: m.exam?.maxMarks || 100,
    percentage: m.exam?.maxMarks ? ((m.obtainedMarks / m.exam.maxMarks) * 100).toFixed(1) : '0.0',
    remarks: m.remarks
  }));

  res.json({ success: true, data: formatted });
};