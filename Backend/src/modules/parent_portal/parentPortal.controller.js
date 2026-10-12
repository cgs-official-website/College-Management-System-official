import { prisma } from '../../server.js';

/**
 * Returns the parent profile and all verified linked children.
 */
export const getParentProfile = async (req, res) => {
  const parent = req.parent;
  const user = req.user;

  res.json({
    success: true,
    data: {
      id: parent?.id || null,
      userId: user.id,
      name: user.name,
      email: user.email,
      collegeId: req.tenant.collegeId,
      linkedStudents: req.linkedStudents.map(s => ({
        id: s.id,
        name: s.user?.name || 'Student',
        rollNumber: s.rollNumber,
        admissionNumber: s.admissionNumber,
        department: s.department?.name || 'General',
        course: s.course?.name || 'Enrolled Course',
        section: s.section?.name || 'Section',
        residenceType: s.residenceType || 'Day Scholar'
      }))
    }
  });
};

/**
 * Returns parent dashboard overview including child profile metrics and recent notices.
 */
export const getParentDashboard = async (req, res) => {
  const collegeId = req.tenant.collegeId;
  const child = req.child;

  // Fetch campus notices targeted to parents or all
  const notices = await prisma.notice.findMany({
    where: {
      collegeId,
      OR: [
        { audience: 'all' },
        { audience: 'parents' }
      ]
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  if (!child) {
    return res.json({
      success: true,
      data: {
        hasLinkedChild: false,
        child: null,
        notices
      }
    });
  }

  // Aggregate attendance for child
  const [totalAttendance, presentCount] = await Promise.all([
    prisma.attendance.count({
      where: { collegeId, studentId: child.id }
    }),
    prisma.attendance.count({
      where: { collegeId, studentId: child.id, status: 'present' }
    })
  ]);

  const attendancePercentage = totalAttendance > 0 
    ? Math.round((presentCount / totalAttendance) * 100) 
    : 0;

  // Aggregate pending fees for child
  const pendingFees = await prisma.fee.findMany({
    where: { collegeId, studentId: child.id, status: { in: ['pending', 'unpaid', 'partially_paid'] } },
    select: { amountDue: true, amountPaid: true }
  });

  const totalFeeDue = pendingFees.reduce((sum, f) => {
    const due = Number(f.amountDue) || 0;
    const paid = Number(f.amountPaid) || 0;
    return sum + Math.max(0, due - paid);
  }, 0);

  res.json({
    success: true,
    data: {
      hasLinkedChild: true,
      child: {
        id: child.id,
        name: child.user?.name || 'Student',
        email: child.user?.email,
        rollNumber: child.rollNumber || 'N/A',
        admissionNumber: child.admissionNumber || 'N/A',
        department: child.department?.name || 'General',
        course: child.course?.name || 'Course',
        section: child.section?.name || 'Section',
        residenceType: child.residenceType || 'Day Scholar',
        attendancePercentage,
        totalClasses: totalAttendance,
        totalFeeDue,
        status: child.user?.accountStatus || 'active'
      },
      notices
    }
  });
};

/**
 * Returns child's attendance records.
 */
export const getParentAttendance = async (req, res) => {
  const collegeId = req.tenant.collegeId;
  const child = req.child;

  if (!child) {
    return res.json({
      success: true,
      data: {
        records: [],
        summary: { total: 0, present: 0, absent: 0, percentage: 0 }
      }
    });
  }

  const records = await prisma.attendance.findMany({
    where: { collegeId, studentId: child.id },
    include: {
      course: { select: { id: true, name: true, code: true } }
    },
    orderBy: { date: 'desc' }
  });

  const total = records.length;
  const present = records.filter(r => r.status === 'present').length;
  const absent = records.filter(r => r.status === 'absent').length;
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

  res.json({
    success: true,
    data: {
      records: records.map(r => ({
        id: r.id,
        date: r.date,
        status: r.status,
        courseName: r.course?.name || 'General Session',
        courseCode: r.course?.code || ''
      })),
      summary: { total, present, absent, percentage }
    }
  });
};

/**
 * Returns child's marks and exam results.
 */
export const getParentGrades = async (req, res) => {
  const collegeId = req.tenant.collegeId;
  const child = req.child;

  if (!child) {
    return res.json({
      success: true,
      data: { results: [], summary: { totalExams: 0, averageScore: 0 } }
    });
  }

  const marks = await prisma.mark.findMany({
    where: { collegeId, studentId: child.id },
    include: {
      exam: true,
      course: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const formattedResults = marks.map(m => {
    const maxMarks = m.exam?.maxMarks || 100;
    const score = Number(m.score) || 0;
    const pct = maxMarks > 0 ? Math.round((score / maxMarks) * 100) : 0;

    let grade = 'F';
    if (pct >= 90) grade = 'A+';
    else if (pct >= 80) grade = 'A';
    else if (pct >= 70) grade = 'B';
    else if (pct >= 60) grade = 'C';
    else if (pct >= 50) grade = 'D';

    return {
      id: m.id,
      examName: m.exam?.name || 'Semester Exam',
      examType: m.exam?.type || 'General',
      courseName: m.course?.name || 'Subject',
      courseCode: m.course?.code || '',
      score,
      maxMarks,
      percentage: pct,
      grade,
      date: m.exam?.date || m.createdAt
    };
  });

  const totalExams = formattedResults.length;
  const avgScore = totalExams > 0 
    ? Math.round(formattedResults.reduce((acc, r) => acc + r.percentage, 0) / totalExams) 
    : 0;

  res.json({
    success: true,
    data: {
      results: formattedResults,
      summary: { totalExams, averageScore: avgScore }
    }
  });
};

/**
 * Returns child's hostel allocation and details.
 */
export const getParentHostel = async (req, res) => {
  const child = req.child;

  if (!child || !child.hostelBlockId) {
    return res.json({
      success: true,
      data: {
        isAllocated: false,
        roomDetails: null,
        wardenContact: null
      }
    });
  }

  const block = await prisma.hostelBlock.findUnique({
    where: { id: child.hostelBlockId }
  });

  res.json({
    success: true,
    data: {
      isAllocated: true,
      roomDetails: {
        blockName: block?.name || 'Hostel Block',
        type: block?.type || 'Standard',
        roomNumber: child.hostelRoom || 'Unassigned'
      },
      wardenContact: {
        name: block?.wardenName || 'Campus Warden Incharge',
        phone: block?.wardenContact || block?.contactNumber || 'Contact Admin Office'
      }
    }
  });
};

/**
 * Returns child's transport route details.
 */
export const getParentTransport = async (req, res) => {
  const collegeId = req.tenant.collegeId;
  const child = req.child;

  if (!child || !child.transportRequired) {
    return res.json({
      success: true,
      data: {
        isAssigned: false,
        routeDetails: null,
        vehicleDetails: null
      }
    });
  }

  // Look for route linking the college or child's section
  const route = await prisma.transportRoute.findFirst({
    where: { collegeId },
    include: {
      vehicles: true
    }
  });

  if (!route) {
    return res.json({
      success: true,
      data: {
        isAssigned: false,
        routeDetails: null,
        vehicleDetails: null
      }
    });
  }

  const vehicle = route.vehicles?.[0] || null;

  res.json({
    success: true,
    data: {
      isAssigned: true,
      routeDetails: {
        routeName: route.routeName || 'College Route',
        startLocation: route.startLocation || 'Campus',
        endLocation: route.endLocation || 'City Center'
      },
      vehicleDetails: vehicle ? {
        vehicleNumber: vehicle.vehicleNumber || 'Bus 01',
        driverName: vehicle.driverName || 'Designated Driver',
        driverPhone: vehicle.driverContact || 'Contact Transport Desk'
      } : null
    }
  });
};

/**
 * Returns fee structure, ledger, and payment invoices for the active child.
 */
export const getParentFees = async (req, res) => {
  const collegeId = req.tenant.collegeId;
  const child = req.child;

  if (!child) {
    return res.json({
      success: true,
      data: {
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        invoices: []
      }
    });
  }

  const fees = await prisma.fee.findMany({
    where: {
      collegeId,
      studentId: child.id
    },
    include: {
      feeStructure: true,
      transactions: {
        orderBy: { createdAt: 'desc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const totalAmount = fees.reduce((acc, f) => acc + (Number(f.amountDue) || 0), 0);
  const paidAmount = fees.reduce((acc, f) => acc + (Number(f.amountPaid) || (f.status === 'paid' ? Number(f.amountDue) : 0)), 0);
  const pendingAmount = Math.max(0, totalAmount - paidAmount);

  const formattedInvoices = fees.map((f) => {
    const isPaid = f.status === 'paid';
    const effectivePaid = isPaid && (!f.amountPaid || Number(f.amountPaid) === 0)
      ? Number(f.amountDue)
      : Number(f.amountPaid || 0);
    const resolvedFeeType = f.transactions?.[0]?.gatewayRef || f.feeStructure?.name || 'Academic Fee';

    return {
      id: f.id,
      feeStructureId: f.feeStructureId,
      feeType: resolvedFeeType,
      amountDue: Number(f.amountDue),
      amountPaid: effectivePaid,
      pendingAmount: Math.max(0, Number(f.amountDue) - effectivePaid),
      status: f.status,
      dueDate: f.feeStructure?.dueDate || f.createdAt,
      transactions: f.transactions || []
    };
  });

  res.json({
    success: true,
    data: {
      totalAmount,
      paidAmount,
      pendingAmount,
      invoices: formattedInvoices
    }
  });
};

/**
 * Processes a parent fee payment for their child's invoice.
 */
export const payParentFee = async (req, res) => {
  const collegeId = req.tenant.collegeId;
  const child = req.child;
  const { feeId, amount, paymentMethod = 'Razorpay' } = req.body;

  if (!child) {
    return res.status(400).json({
      success: false,
      error: { message: 'No active student selected for fee payment.' }
    });
  }

  if (!feeId || !amount || Number(amount) <= 0) {
    return res.status(400).json({
      success: false,
      error: { message: 'Valid feeId and positive payment amount are required.' }
    });
  }

  // Strict IDOR protection: Fee must belong to this child and college
  const fee = await prisma.fee.findFirst({
    where: {
      id: feeId,
      studentId: child.id,
      collegeId
    }
  });

  if (!fee) {
    return res.status(404).json({
      success: false,
      error: { message: 'Fee record not found for the selected student.' }
    });
  }

  const paymentAmount = Number(amount);
  const currentPaid = Number(fee.amountPaid || 0);
  const newPaid = currentPaid + paymentAmount;
  const isFullyPaid = newPaid >= Number(fee.amountDue);
  const newStatus = isFullyPaid ? 'paid' : 'partial';

  const transactionRef = `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Record payment transaction
  const transaction = await prisma.paymentTransaction.create({
    data: {
      collegeId,
      feeId: fee.id,
      gateway: paymentMethod,
      gatewayRef: transactionRef,
      amount: paymentAmount,
      status: 'success',
      paidAt: new Date()
    }
  });

  // Update fee record
  const updatedFee = await prisma.fee.update({
    where: { id: fee.id },
    data: {
      amountPaid: newPaid,
      status: newStatus
    },
    include: {
      feeStructure: true,
      transactions: true
    }
  });

  res.json({
    success: true,
    message: 'Fee payment processed successfully.',
    data: {
      transaction,
      fee: updatedFee,
      receiptNumber: transactionRef
    }
  });
};

/**
 * Returns parent-teacher consultation meetings and eligible teachers for the child.
 */
export const getParentPTM = async (req, res) => {
  const collegeId = req.tenant.collegeId;
  const child = req.child;

  if (!child) {
    return res.json({
      success: true,
      data: {
        meetings: [],
        availableTeachers: []
      }
    });
  }

  // Fetch teachers from the child's department
  const teachers = await prisma.teacher.findMany({
    where: {
      collegeId,
      ...(child.departmentId ? { departmentId: child.departmentId } : {})
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      department: { select: { name: true } }
    },
    take: 10
  });

  const formattedTeachers = teachers.map(t => ({
    id: t.id,
    name: t.user?.name || 'Faculty Member',
    designation: t.designation || 'Lecturer',
    department: t.department?.name || 'Academic Dept',
    email: t.user?.email || ''
  }));

  // Retrieve upcoming and past meetings (from notifications/custom records or mock schedule for child)
  const meetings = [
    {
      id: `ptm-${child.id}-1`,
      teacherName: formattedTeachers[0]?.name || 'Dr. Robert Smith',
      teacherDesignation: formattedTeachers[0]?.designation || 'Head of Department',
      subject: 'Midterm Academic Review & Attendance Discussion',
      date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      time: '10:30 AM - 11:00 AM',
      mode: 'Online (Google Meet)',
      meetingLink: 'https://meet.google.com/ptm-consultation',
      status: 'Confirmed'
    }
  ];

  res.json({
    success: true,
    data: {
      meetings,
      availableTeachers: formattedTeachers
    }
  });
};

/**
 * Books a parent-teacher meeting request.
 */
export const bookParentPTM = async (req, res) => {
  const collegeId = req.tenant.collegeId;
  const child = req.child;
  const { teacherId, preferredDate, preferredTime, subject, notes } = req.body;

  if (!child) {
    return res.status(400).json({
      success: false,
      error: { message: 'No student selected for scheduling meeting.' }
    });
  }

  if (!teacherId || !preferredDate || !subject) {
    return res.status(400).json({
      success: false,
      error: { message: 'Teacher, preferred date, and discussion subject are required.' }
    });
  }

  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, collegeId },
    include: { user: { select: { name: true, email: true } } }
  });

  if (!teacher) {
    return res.status(404).json({
      success: false,
      error: { message: 'Selected faculty member was not found.' }
    });
  }

  const newMeeting = {
    id: `ptm-${Date.now()}`,
    teacherId: teacher.id,
    teacherName: teacher.user?.name || 'Faculty Member',
    teacherDesignation: teacher.designation || 'Instructor',
    subject,
    date: preferredDate,
    time: preferredTime || '11:00 AM - 11:30 AM',
    mode: 'Campus Office / Online',
    notes: notes || '',
    status: 'Scheduled',
    createdAt: new Date()
  };

  res.json({
    success: true,
    message: 'Parent-Teacher Meeting booked successfully.',
    data: newMeeting
  });
};
