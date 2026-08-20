import { prisma, logger } from '../../server.js';
import { enterMarksSchema } from './exams.schema.js';

export const enterMarks = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const { studentId, examId, obtainedMarks, remarks } = enterMarksSchema.parse(req.body);
    const teacherId = req.user.userId;

    // Fetch exam to validate max marks
    const exam = await prisma.exam.findFirst({
      where: { id: examId, collegeId }
    });

    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // "obtained_marks > max_marks is a hard block — return 422, do not persist"
    if (obtainedMarks > exam.maxMarks) {
      return res.status(422).json({ 
        error: `Marks cannot exceed maximum marks (${exam.maxMarks})` 
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

    res.status(201).json({ data: markRecord });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Marks already entered for this student' });
    }
    res.status(400).json({ error: { message: error.message } });
  }
};
