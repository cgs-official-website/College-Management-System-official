import { prisma, logger } from '../../server.js';

export const getFees = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const { status, studentId } = req.query;

  const where = { collegeId };
  if (status) where.status = status;
  if (studentId) where.studentId = studentId;

  // If student is logged in, restrict to their own fees
  if (req.user?.role === 'student' && req.user?.userId) {
    const student = await prisma.student.findUnique({ where: { userId: req.user.userId } });
    if (student) where.studentId = student.id;
  }

  const fees = await prisma.fee.findMany({
    where,
    include: {
      student: {
        select: {
          id: true,
          rollNumber: true,
          admissionNumber: true,
          user: { select: { name: true, email: true } }
        }
      },
      feeStructure: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  const formatted = fees.map(f => ({
    ...f,
    amount: f.amountDue,
    feeType: f.feeStructure?.name || 'Tuition Fee',
    studentName: f.student?.user?.name || `Student ${f.student?.admissionNumber || ''}`.trim()
  }));

  res.json({ success: true, data: formatted });
};

export const createFee = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { studentId, feeStructureId, amountDue, amount, feeType, status, amountPaid } = req.body;

  const dueAmount = Number(amountDue !== undefined ? amountDue : (amount !== undefined ? amount : 0));

  let finalFeeStructureId = feeStructureId;
  if (!finalFeeStructureId) {
    let fs = await prisma.feeStructure.findFirst({
      where: { collegeId }
    });
    if (!fs) {
      fs = await prisma.feeStructure.create({
        data: {
          collegeId,
          semester: 1,
          totalAmount: dueAmount || 50000,
          dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000)
        }
      });
    }
    finalFeeStructureId = fs.id;
  }

  const initialStatus = status || 'pending';
  const initialPaid = amountPaid !== undefined ? Number(amountPaid) : (initialStatus === 'paid' ? dueAmount : 0);

  const fee = await prisma.fee.create({
    data: {
      collegeId,
      studentId,
      feeStructureId: finalFeeStructureId,
      amountDue: dueAmount,
      amountPaid: initialPaid,
      status: initialStatus
    },
    include: {
      feeStructure: true
    }
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} feeId=${fee.id} actor=${actorId} Created fee record`);
  res.status(201).json({
    success: true,
    data: {
      ...fee,
      amount: fee.amountDue,
      feeType: fee.feeStructure?.name || 'Tuition Fee'
    }
  });
};

export const updateFee = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { id } = req.params;
  const { status, amountPaid, amount, amountDue } = req.body;

  const existing = await prisma.fee.findFirst({
    where: { id, collegeId }
  });

  if (!existing) {
    return res.status(404).json({ success: false, error: { code: 'FEE_NOT_FOUND', message: 'Fee record not found' } });
  }

  const updateData = {};
  if (status) updateData.status = status;
  if (amountDue !== undefined) {
    updateData.amountDue = Number(amountDue);
  } else if (amount !== undefined) {
    updateData.amountDue = Number(amount);
  }
  if (amountPaid !== undefined) {
    updateData.amountPaid = Number(amountPaid);
  } else if (status === 'paid') {
    updateData.amountPaid = updateData.amountDue !== undefined ? updateData.amountDue : existing.amountDue;
  }

  const fee = await prisma.fee.update({
    where: { id },
    data: updateData,
    include: {
      feeStructure: true
    }
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} feeId=${id} actor=${actorId} Updated fee record`);
  res.json({
    success: true,
    data: {
      ...fee,
      amount: fee.amountDue,
      feeType: fee.feeStructure?.name || 'Tuition Fee'
    }
  });
};

export const deleteFee = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { id } = req.params;

  const existing = await prisma.fee.findFirst({
    where: { id, collegeId }
  });

  if (!existing) {
    return res.status(404).json({ success: false, error: { code: 'FEE_NOT_FOUND', message: 'Fee record not found' } });
  }

  await prisma.fee.delete({ where: { id } });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} feeId=${id} actor=${actorId} Deleted fee record`);
  res.json({ success: true, message: 'Fee record deleted successfully' });
};
