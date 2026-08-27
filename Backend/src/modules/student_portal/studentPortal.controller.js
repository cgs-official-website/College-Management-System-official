import { prisma, logger } from '../../server.js';
import { redis, redisKeys } from '../../lib/cache.js';
import { processStudentProfileImageBuffer, extractBufferFromBase64Payload } from '../../lib/imageProcessor.js';

export const getStudentProfile = async (req, res) => {
  try {
    const student = req.student;
    
    // Split name
    const nameParts = (student.user?.name || '').split(' ');
    const firstName = nameParts[0] || 'Student';
    const lastName = nameParts.slice(1).join(' ') || '';

    res.json({
      success: true,
      data: {
        id: student.id,
        admissionNo: student.admissionNumber,
        admissionNumber: student.admissionNumber,
        rollNumber: student.rollNumber,
        firstName,
        lastName,
        name: student.user?.name || `${firstName} ${lastName}`.trim(),
        email: student.user?.email || student.emailId,
        mobile: student.studentMobile || student.emergencyContact,
        department: student.department?.name || '',
        departmentCode: student.department?.code || '',
        departmentId: student.departmentId,
        section: student.section?.name || '',
        sectionId: student.sectionId,
        batchYear: student.batchYear,
        bloodGroup: student.bloodGroup,
        emergencyContact: student.emergencyContact,
        residenceType: student.residenceType || 'Day Scholar',
        isHosteller: (student.residenceType || '').toLowerCase().includes('hostel'),
        isDayScholar: !(student.residenceType || '').toLowerCase().includes('hostel'),
        hostelBlock: student.hostelBlock?.name || null,
        hostelRoom: student.hostelRoom,
        collegeName: student.college?.name,
        collegeLogo: student.college?.logoUrl,
        yearOfStudy: student.yearOfStudy || student.batchYear,
        status: student.user?.accountStatus || 'active',
        hasProfileImage: Boolean(student.profileImageMimeType),
        profileImageUrl: student.profileImageMimeType ? '/api/v1/student/profile/image' : null,
        createdAt: student.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const getStudentDashboard = async (req, res) => {
  try {
    const student = req.student;
    const collegeId = student.collegeId;
    const studentId = student.id;

    // Cache-aside for student dashboard metrics
    const cacheKey = `student:dashboard:${collegeId}:${studentId}`;
    if (redis.status === 'ready') {
      const cached = await redis.get(cacheKey).catch(() => null);
      if (cached) {
        return res.json({ success: true, data: JSON.parse(cached) });
      }
    }

    // 1. Attendance calculation
    const attendanceRecords = await prisma.attendance.findMany({
      where: { studentId }
    });
    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(a => a.status === 'present' || a.status === 'late').length;
    const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

    // 2. Courses
    const coursesCount = await prisma.course.count({
      where: {
        collegeId,
        departmentId: student.departmentId,
        deletedAt: null
      }
    });

    // 3. Assignments & Pending Submissions
    const assignments = await prisma.assignment.findMany({
      where: { collegeId },
      include: {
        submissions: {
          where: { studentId }
        }
      }
    });
    const pendingAssignments = assignments.filter(a => a.submissions.length === 0).length;

    // 4. Upcoming Exams
    const upcomingExams = await prisma.exam.count({
      where: {
        collegeId,
        date: { gte: new Date() }
      }
    });

    // 5. Fees summary
    const fees = await prisma.fee.findMany({
      where: { studentId }
    });
    const totalFees = fees.reduce((acc, f) => acc + (f.amountDue || 0), 0);
    const paidFees = fees.reduce((acc, f) => acc + (f.amountPaid || (f.status === 'paid' ? f.amountDue : 0)), 0);
    const dueFees = Math.max(0, totalFees - paidFees);

    // 6. Recent Notices
    const recentNotices = await prisma.notice.findMany({
      where: { collegeId },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    const dashboardData = {
      student: {
        name: student.user?.name,
        admissionNumber: student.admissionNumber,
        department: student.department?.name,
        section: student.section?.name,
        batchYear: student.batchYear
      },
      metrics: {
        attendancePercentage,
        totalDays,
        presentDays,
        coursesCount,
        pendingAssignments,
        upcomingExams,
        totalFees,
        paidFees,
        dueFees
      },
      recentNotices: recentNotices.map(n => ({
        id: n.id,
        title: n.title,
        content: n.content,
        date: n.createdAt,
        priority: n.priority || 'normal'
      }))
    };

    if (redis.status === 'ready') {
      await redis.set(cacheKey, JSON.stringify(dashboardData), 'EX', 120).catch(() => {});
    }

    res.json({ success: true, data: dashboardData });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const getStudentCourses = async (req, res) => {
  try {
    const student = req.student;
    const courses = await prisma.course.findMany({
      where: {
        collegeId: student.collegeId,
        departmentId: student.departmentId,
        deletedAt: null
      },
      include: {
        department: true
      },
      orderBy: { semester: 'asc' }
    });

    res.json({ success: true, data: courses });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const getStudentAssignments = async (req, res) => {
  try {
    const student = req.student;
    const assignments = await prisma.assignment.findMany({
      where: {
        collegeId: student.collegeId
      },
      include: {
        course: true,
        submissions: {
          where: { studentId: student.id }
        }
      },
      orderBy: { dueDate: 'asc' }
    });

    const formatted = assignments.map(a => {
      const sub = a.submissions[0];
      return {
        id: a.id,
        title: a.title,
        description: a.description,
        courseName: a.course?.name || 'General Course',
        courseCode: a.course?.code || '',
        dueDate: a.dueDate,
        attachmentUrl: a.attachmentUrl || null,
        status: sub ? (sub.score !== null ? 'Graded' : 'Submitted') : (new Date(a.dueDate) < new Date() ? 'Overdue' : 'Pending'),
        submittedAt: sub?.submittedAt || null,
        score: sub?.score || null,
        feedback: sub?.feedback || null,
        submissionFileUrl: sub?.fileUrl || null
      };
    });

    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const submitStudentAssignment = async (req, res) => {
  try {
    const student = req.student;
    const { id } = req.params;
    const { fileUrl } = req.body;

    if (!fileUrl) {
      return res.status(400).json({ success: false, error: { message: 'Submission file URL is required' } });
    }

    const assignment = await prisma.assignment.findFirst({
      where: { id, collegeId: student.collegeId }
    });

    if (!assignment) {
      return res.status(404).json({ success: false, error: { message: 'Assignment not found' } });
    }

    const submission = await prisma.assignmentSubmission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId: id,
          studentId: student.id
        }
      },
      update: {
        fileUrl,
        submittedAt: new Date(),
        status: 'submitted'
      },
      create: {
        collegeId: student.collegeId,
        assignmentId: id,
        studentId: student.id,
        fileUrl,
        status: 'submitted'
      }
    });

    res.json({ success: true, data: submission });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const getStudentAttendance = async (req, res) => {
  try {
    const student = req.student;
    const attendance = await prisma.attendance.findMany({
      where: {
        studentId: student.id
      },
      include: {
        course: true
      },
      orderBy: { date: 'desc' }
    });

    const totalDays = attendance.length;
    const presentDays = attendance.filter(a => a.status === 'present' || a.status === 'late').length;
    const absentDays = attendance.filter(a => a.status === 'absent').length;
    const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

    res.json({
      success: true,
      data: {
        percentage,
        totalDays,
        presentDays,
        absentDays,
        records: attendance
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const getStudentLeaveRequests = async (req, res) => {
  try {
    const student = req.student;
    const leaves = await prisma.leaveRequest.findMany({
      where: {
        collegeId: student.collegeId,
        requesterUserId: student.userId
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: leaves });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const createStudentLeaveRequest = async (req, res) => {
  try {
    const student = req.student;
    const { fromDate, toDate, reason, leaveType } = req.body;

    if (!fromDate || !toDate || !reason) {
      return res.status(400).json({ success: false, error: { message: 'From date, to date, and reason are required' } });
    }

    const leave = await prisma.leaveRequest.create({
      data: {
        collegeId: student.collegeId,
        requesterUserId: student.userId,
        requesterRole: 'student',
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
        reason: `${leaveType ? `[${leaveType}] ` : ''}${reason}`,
        status: 'pending'
      }
    });

    res.status(201).json({ success: true, data: leave });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const getStudentTimetable = async (req, res) => {
  try {
    const student = req.student;
    const slots = await prisma.timetableSlot.findMany({
      where: {
        collegeId: student.collegeId,
        ...(student.sectionId ? { sectionId: student.sectionId } : {})
      },
      include: {
        course: true,
        section: true,
        teacher: {
          include: {
            user: { select: { name: true } }
          }
        }
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
    });

    res.json({ success: true, data: slots });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const getStudentExams = async (req, res) => {
  try {
    const student = req.student;
    const exams = await prisma.exam.findMany({
      where: {
        collegeId: student.collegeId
      },
      include: {
        course: true
      },
      orderBy: { date: 'asc' }
    });

    const formatted = exams.map(e => ({
      id: e.id,
      name: e.name,
      title: e.name,
      date: e.date,
      type: e.type,
      maxMarks: e.maxMarks,
      course: e.course
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const getStudentResults = async (req, res) => {
  try {
    const student = req.student;
    const marks = await prisma.mark.findMany({
      where: {
        studentId: student.id
      },
      include: {
        exam: {
          include: { course: true }
        }
      }
    });

    const formatted = marks.map(m => ({
      id: m.id,
      score: m.obtainedMarks,
      obtainedMarks: m.obtainedMarks,
      remarks: m.remarks,
      exam: {
        id: m.exam?.id,
        title: m.exam?.name,
        name: m.exam?.name,
        maxMarks: m.exam?.maxMarks,
        type: m.exam?.type,
        course: m.exam?.course
      }
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const getStudentFees = async (req, res) => {
  try {
    const student = req.student;
    const fees = await prisma.fee.findMany({
      where: {
        studentId: student.id
      },
      include: {
        feeStructure: true,
        transactions: true
      }
    });

    const totalAmount = fees.reduce((acc, f) => acc + (f.amountDue || 0), 0);
    const paidAmount = fees.reduce((acc, f) => acc + (f.amountPaid || (f.status === 'paid' ? f.amountDue : 0)), 0);
    const pendingAmount = Math.max(0, totalAmount - paidAmount);

    res.json({
      success: true,
      data: {
        totalAmount,
        paidAmount,
        pendingAmount,
        invoices: fees
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const getStudentNotices = async (req, res) => {
  try {
    const student = req.student;
    const notices = await prisma.notice.findMany({
      where: {
        collegeId: student.collegeId
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: notices });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const getStudentLibrary = async (req, res) => {
  try {
    const student = req.student;
    const { search, category } = req.query;

    const books = await prisma.libraryItem.findMany({
      where: {
        collegeId: student.collegeId,
        ...(category ? { category: { equals: category, mode: 'insensitive' } } : {}),
        ...(search ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { author: { contains: search, mode: 'insensitive' } },
            { isbn: { contains: search, mode: 'insensitive' } }
          ]
        } : {})
      },
      orderBy: { title: 'asc' }
    });

    res.json({ success: true, data: books });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const getStudentPlacements = async (req, res) => {
  try {
    const student = req.student;
    const drives = await prisma.placement.findMany({
      where: {
        collegeId: student.collegeId
      },
      orderBy: { id: 'desc' }
    });

    const formatted = drives.map(d => {
      const details = typeof d.eligibility === 'object' && d.eligibility !== null ? d.eligibility : {};
      return {
        id: d.id,
        companyName: d.companyName,
        role: details.role || 'Graduate Trainee',
        ctc: details.ctc || 'N/A',
        driveDate: details.driveDate || null,
        status: details.status || 'upcoming',
        eligibilityCriteria: details.eligibilityCriteria || 'All final year students eligible',
        studentsPlaced: Number(details.studentsPlaced || 0)
      };
    });

    res.json({ success: true, data: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const getStudentComplaints = async (req, res) => {
  try {
    const student = req.student;
    const complaints = await prisma.complaint.findMany({
      where: {
        collegeId: student.collegeId,
        userId: student.userId
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: complaints });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const createStudentComplaint = async (req, res) => {
  try {
    const student = req.student;
    const { title, subject, description, category, priority } = req.body;

    const finalSubject = subject || title;
    if (!finalSubject || !description) {
      return res.status(400).json({ success: false, error: { message: 'Subject and description are required' } });
    }

    const complaint = await prisma.complaint.create({
      data: {
        collegeId: student.collegeId,
        userId: student.userId,
        subject: finalSubject,
        description,
        category: category || 'General',
        priority: priority || 'medium',
        status: 'open'
      }
    });

    res.status(201).json({ success: true, data: complaint });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const getStudentHostel = async (req, res) => {
  try {
    const student = req.student;
    const isHosteller = (student.residenceType || '').toLowerCase().includes('hostel');

    if (!isHosteller && !student.hostelBlockId && !student.hostelRoom) {
      return res.json({
        success: true,
        data: {
          isHosteller: false,
          message: 'Student is registered as a Day Scholar'
        }
      });
    }

    res.json({
      success: true,
      data: {
        isHosteller: true,
        blockName: student.hostelBlock?.name || 'Main Hostel Block',
        roomNo: student.hostelRoom || 'N/A',
        residenceType: student.residenceType || 'Hostel'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const getStudentTransport = async (req, res) => {
  try {
    const student = req.student;
    const isHosteller = (student.residenceType || '').toLowerCase().includes('hostel');

    if (isHosteller) {
      return res.json({
        success: true,
        data: {
          isTransportEligible: false,
          isHosteller: true,
          message: 'Transport module is not applicable for hostel residents'
        }
      });
    }

    res.json({
      success: true,
      data: {
        isTransportEligible: true,
        isHosteller: false,
        transportRequired: student.transportRequired || 'No',
        route: 'Campus Route 1',
        pickupPoint: student.address || 'Campus Gate'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const getStudentDocuments = async (req, res) => {
  try {
    const student = req.student;
    const docs = await prisma.documentVault.findMany({
      where: { collegeId: student.collegeId }
    });

    res.json({ success: true, data: docs });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};

export const getStudentProfileImage = async (req, res) => {
  try {
    const studentId = req.student.id;
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        profileImageData: true,
        profileImageMimeType: true
      }
    });

    if (!student || !student.profileImageData) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Profile image not found' }
      });
    }

    const imageBuffer = Buffer.from(student.profileImageData, 'base64');
    const mimeType = student.profileImageMimeType || 'image/webp';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', imageBuffer.length);
    res.setHeader('Cache-Control', 'private, max-age=3600, stale-while-revalidate=600');
    return res.end(imageBuffer);
  } catch (error) {
    logger.error({ studentId: req.student?.id, err: error.message }, 'Failed to retrieve profile image');
    return res.status(500).json({ success: false, error: { message: 'Failed to retrieve profile image' } });
  }
};

export const uploadStudentProfileImage = async (req, res) => {
  try {
    const studentId = req.student.id;
    const collegeId = req.student.collegeId;

    let buffer = null;

    if (req.file && req.file.buffer) {
      buffer = req.file.buffer;
    } else if (req.body?.profileImage || req.body?.image || req.body?.data) {
      const payload = req.body.profileImage || req.body.image || req.body;
      buffer = extractBufferFromBase64Payload(payload);
    } else {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'No image file or Base64 data provided' }
      });
    }

    const { profileImageData, profileImageMimeType, sizeBytes } = await processStudentProfileImageBuffer(buffer);

    await prisma.student.update({
      where: { id: studentId },
      data: {
        profileImageData,
        profileImageMimeType
      }
    });

    // Invalidate Redis profile cache if available
    try {
      if (redis && redis.status === 'ready') {
        const cacheKey = `student_profile:${collegeId}:${studentId}`;
        await redis.del(cacheKey);
      }
    } catch (cacheErr) {
      logger.warn({ studentId, err: cacheErr.message }, 'Failed to invalidate student profile cache');
    }

    logger.info({ studentId, collegeId, mimeType: profileImageMimeType, sizeBytes }, 'Student profile image updated');

    return res.status(200).json({
      success: true,
      data: {
        message: 'Profile image updated successfully',
        hasProfileImage: true,
        profileImageUrl: '/api/v1/student/profile/image',
        mimeType: profileImageMimeType
      }
    });
  } catch (error) {
    const statusCode = error.status || 500;
    logger.warn({ studentId: req.student?.id, status: statusCode, errorMsg: error.message }, 'Profile image upload failed');
    return res.status(statusCode).json({
      success: false,
      error: { code: statusCode === 413 ? 'PAYLOAD_TOO_LARGE' : 'BAD_REQUEST', message: error.message }
    });
  }
};

export const deleteStudentProfileImage = async (req, res) => {
  try {
    const studentId = req.student.id;
    const collegeId = req.student.collegeId;

    await prisma.student.update({
      where: { id: studentId },
      data: {
        profileImageData: null,
        profileImageMimeType: null
      }
    });

    try {
      if (redis && redis.status === 'ready') {
        const cacheKey = `student_profile:${collegeId}:${studentId}`;
        await redis.del(cacheKey);
      }
    } catch (cacheErr) {
      logger.warn({ studentId, err: cacheErr.message }, 'Failed to invalidate student profile cache');
    }

    logger.info({ studentId, collegeId }, 'Student profile image deleted');

    return res.json({
      success: true,
      data: {
        message: 'Profile image deleted successfully',
        hasProfileImage: false,
        profileImageUrl: null
      }
    });
  } catch (error) {
    logger.error({ studentId: req.student?.id, err: error.message }, 'Failed to delete profile image');
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to delete profile image' }
    });
  }
};
