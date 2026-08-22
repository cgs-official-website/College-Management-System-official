import { prisma, logger } from '../../server.js';
import { createExamSchema, updateExamSchema, enterMarksSchema, batchEnterMarksSchema } from './exams.schema.js';

// Helper to ensure dummy/default course if needed
async function ensureDefaultCourse(collegeId, courseName) {
  let dept = await prisma.department.findFirst({ where: { collegeId } });
  if (!dept) {
    dept = await prisma.department.create({
      data: { collegeId, name: 'General Department', code: 'GEN' }
    });
  }

  let course = null;
  if (courseName) {
    course = await prisma.course.findFirst({ where: { collegeId, name: courseName } });
  }

  if (!course) {
    course = await prisma.course.findFirst({ where: { collegeId } });
  }

  if (!course) {
    course = await prisma.course.create({
      data: {
        collegeId,
        departmentId: dept.id,
        name: courseName || 'General Engineering',
        code: `CRS-${Math.floor(100 + Math.random() * 900)}`,
        semester: 1,
        credits: 3
      }
    });
  }

  return course.id;
}

export const getExams = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const exams = await prisma.exam.findMany({
    where: { collegeId },
    include: {
      course: true,
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
      courseId: exam.courseId,
      date: exam.date ? new Date(exam.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      maxMarks: exam.maxMarks,
      type: exam.type || 'Midterm',
      status: exam.status || 'active',
      totalStudentsAppeared,
      averageScore: avgScore,
      marks: exam.marks.map(m => ({
        id: m.id,
        studentId: m.studentId,
        studentName: `${m.student?.user?.firstName || ''} ${m.student?.user?.lastName || ''}`.trim() || 'Student',
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

  const courseId = payload.courseId || await ensureDefaultCourse(collegeId, payload.courseName || payload.subject);

  const exam = await prisma.exam.create({
    data: {
      collegeId,
      courseId,
      name: payload.name || payload.subject || 'Examination',
      date: payload.date ? new Date(payload.date) : new Date(),
      maxMarks: Number(payload.maxMarks) || 100,
      type: payload.type || 'Midterm',
      status: payload.status || 'pending'
    },
    include: { course: true }
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} examId=${exam.id} actor=${actorId} Scheduled exam '${exam.name}'`);
  
  res.status(201).json({
    success: true,
    data: {
      id: exam.id,
      title: exam.name,
      name: exam.name,
      subject: exam.course?.name || exam.name,
      courseName: exam.course?.name || 'General Program',
      date: exam.date.toISOString().split('T')[0],
      maxMarks: exam.maxMarks,
      type: exam.type,
      status: exam.status
    }
  });
};

export const updateExam = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { id } = req.params;
  const payload = updateExamSchema.parse(req.body);

  const existing = await prisma.exam.findFirst({
    where: { id, collegeId }
  });

  if (!existing) {
    return res.status(404).json({ success: false, error: { code: 'EXAM_NOT_FOUND', message: 'Exam not found' } });
  }

  const updateData = {};
  if (payload.name) updateData.name = payload.name;
  if (payload.maxMarks !== undefined) updateData.maxMarks = Number(payload.maxMarks);
  if (payload.type) updateData.type = payload.type;
  if (payload.status) updateData.status = payload.status;
  if (payload.date) updateData.date = new Date(payload.date);

  const updated = await prisma.exam.update({
    where: { id },
    data: updateData,
    include: { course: true }
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} examId=${id} actor=${actorId} Updated exam details`);
  res.json({ success: true, data: updated });
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

  const markRecord = await prisma.mark.upsert({
    where: {
      examId_studentId: { examId, studentId }
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

  res.status(201).json({ success: true, data: markRecord });
};

export const batchEnterMarks = async (req, res) => {
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
        date: new Date()
      }
    });
  } else if (exam.maxMarks !== maxMarks) {
    exam = await prisma.exam.update({
      where: { id: exam.id },
      data: { maxMarks }
    });
  }

  const results = [];
  for (const record of records) {
    if (record.obtainedMarks > exam.maxMarks) {
      continue; // Skip invalid marks
    }

    const markRecord = await prisma.mark.upsert({
      where: {
        unique_student_exam: {
          studentId: record.studentId,
          examId: exam.id
        }
      },
      update: { obtainedMarks: record.obtainedMarks },
      create: {
        studentId: record.studentId,
        examId: exam.id,
        obtainedMarks: record.obtainedMarks
      }
    });
    results.push(markRecord);
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
    studentName: `${m.student?.user?.firstName || ''} ${m.student?.user?.lastName || ''}`.trim() || 'Student',
    rollNumber: m.student?.rollNumber || m.student?.admissionNumber || 'N/A',
    obtainedMarks: m.obtainedMarks,
    maxMarks: m.exam?.maxMarks || 100,
    percentage: m.exam?.maxMarks ? ((m.obtainedMarks / m.exam.maxMarks) * 100).toFixed(1) : '0.0',
    remarks: m.remarks
  }));

  res.json({ success: true, data: formatted });
};
