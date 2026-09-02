import { prisma, logger } from '../../server.js';
import { createFeeSchema, updateFeeSchema } from './fees.schema.js';

// Helper function to format a fee record for frontend & backward compatibility
const formatFeeRecord = (fee) => {
  const student = fee.student;
  const studentName = student?.user?.name || student?.user?.email || 'Student';
  const studentClass = student?.course?.name
    ? (student.section?.name ? `${student.course.name} - ${student.section.name}` : student.course.name)
    : (student?.section?.name || 'General');

  const transaction = fee.transactions?.[0];
  const paymentMethod = transaction?.gateway || '';
  const feeType = transaction?.gatewayRef || 'Tuition Fee';
  const dueDateStr = fee.feeStructure?.dueDate
    ? new Date(fee.feeStructure.dueDate).toISOString().split('T')[0]
    : new Date(fee.createdAt).toISOString().split('T')[0];

  return {
    ...fee,
    amount: fee.amountDue,
    amountDue: fee.amountDue,
    amountPaid: fee.amountPaid,
    dueDate: dueDateStr,
    feeType,
    paymentMethod,
    studentName,
    studentClass
  };
};

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
        include: {
          user: { select: { id: true, name: true, email: true } },
          course: { select: { id: true, name: true, code: true } },
          section: { select: { id: true, name: true } }
        }
      },
      feeStructure: true,
      transactions: {
        orderBy: { createdAt: 'desc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const formatted = fees.map(formatFeeRecord);
  res.json({ success: true, data: formatted });
};

export const createFee = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;

  // Validate incoming body against Zod schema
  const payload = createFeeSchema.parse(req.body);

  const numAmount = payload.amount;
  const isPaid = payload.status === 'paid';

  // Execute atomic creation inside a Prisma transaction
  const createdFee = await prisma.$transaction(async (tx) => {
    // 1. Verify student exists and belongs strictly to the authenticated college
    const student = await tx.student.findFirst({
      where: {
        id: payload.studentId,
        collegeId
      },
      include: {
        course: true,
        section: true,
        user: true
      }
    });

    if (!student) {
      const err = new Error('Student not found or does not belong to your institution');
      err.statusCode = 400;
      err.code = 'INVALID_STUDENT';
      throw err;
    }

    // 2. Resolve FeeStructure (prefer reuse of compatible structure)
    let targetFeeStructureId = payload.feeStructureId;
    const targetSemester = student.course?.semester || 1;
    const targetDepartmentId = student.departmentId || null;
    const targetDueDate = payload.dueDate;

    if (targetFeeStructureId) {
      // If client supplied explicit feeStructureId, verify tenant ownership
      const existingExplicit = await tx.feeStructure.findFirst({
        where: { id: targetFeeStructureId, collegeId }
      });
      if (!existingExplicit) {
        const err = new Error('Fee structure not found or does not belong to this institution');
        err.statusCode = 400;
        err.code = 'INVALID_FEE_STRUCTURE';
        throw err;
      }
    } else {
      // Find compatible existing FeeStructure to prevent duplicates
      const compatibleStructure = await tx.feeStructure.findFirst({
        where: {
          collegeId,
          semester: targetSemester,
          departmentId: targetDepartmentId,
          totalAmount: numAmount,
          dueDate: targetDueDate
        }
      });

      if (compatibleStructure) {
        targetFeeStructureId = compatibleStructure.id;
      } else {
        const newStructure = await tx.feeStructure.create({
          data: {
            collegeId,
            semester: targetSemester,
            departmentId: targetDepartmentId,
            totalAmount: numAmount,
            dueDate: targetDueDate
          }
        });
        targetFeeStructureId = newStructure.id;
      }
    }

    // 3. Create the Fee record
    const fee = await tx.fee.create({
      data: {
        collegeId,
        studentId: student.id,
        feeStructureId: targetFeeStructureId,
        status: payload.status,
        amountDue: numAmount,
        amountPaid: isPaid ? numAmount : 0
      },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            course: { select: { id: true, name: true, code: true } },
            section: { select: { id: true, name: true } }
          }
        },
        feeStructure: true,
        transactions: true
      }
    });

    // 4. Create PaymentTransaction record if paid and paymentMethod is provided
    let createdTx = null;
    if (isPaid && payload.paymentMethod) {
      createdTx = await tx.paymentTransaction.create({
        data: {
          collegeId,
          feeId: fee.id,
          gateway: payload.paymentMethod,
          gatewayRef: payload.feeType || 'Tuition Fee',
          amount: numAmount,
          status: 'success',
          paidAt: new Date()
        }
      });
    }

    return {
      ...fee,
      transactions: createdTx ? [createdTx] : []
    };
  });

  const formatted = formatFeeRecord(createdFee);

  logger.info(`[info] req=${req.id || ''} college=${collegeId} feeId=${createdFee.id} actor=${actorId} Created fee record`);
  res.status(201).json({ success: true, data: formatted });
};

export const updateFee = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { id } = req.params;

  const payload = updateFeeSchema.parse(req.body);

  const existing = await prisma.fee.findFirst({
    where: { id, collegeId },
    include: { feeStructure: true, transactions: true }
  });

  if (!existing) {
    return res.status(404).json({ success: false, error: { code: 'FEE_NOT_FOUND', message: 'Fee record not found' } });
  }

  const updatedFee = await prisma.$transaction(async (tx) => {
    const newStatus = payload.status || existing.status;
    const isPaid = newStatus === 'paid';
    const newAmountDue = payload.amount !== undefined ? payload.amount : (payload.amountDue !== undefined ? Number(payload.amountDue) : existing.amountDue);
    const newAmountPaid = payload.amountPaid !== undefined 
      ? Number(payload.amountPaid) 
      : (isPaid ? newAmountDue : (newStatus === 'pending' || newStatus === 'overdue' ? 0 : existing.amountPaid));

    const fee = await tx.fee.update({
      where: { id },
      data: {
        status: newStatus,
        amountDue: newAmountDue,
        amountPaid: newAmountPaid
      },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            course: { select: { id: true, name: true, code: true } },
            section: { select: { id: true, name: true } }
          }
        },
        feeStructure: true,
        transactions: true
      }
    });

    if (payload.dueDate && existing.feeStructureId) {
      await tx.feeStructure.update({
        where: { id: existing.feeStructureId },
        data: { dueDate: payload.dueDate }
      });
    }

    if (payload.paymentMethod) {
      const existingTx = existing.transactions?.[0];
      if (existingTx) {
        await tx.paymentTransaction.update({
          where: { id: existingTx.id },
          data: {
            gateway: payload.paymentMethod,
            ...(payload.feeType && { gatewayRef: payload.feeType }),
            status: isPaid ? 'success' : existingTx.status,
            paidAt: isPaid ? (existingTx.paidAt || new Date()) : null
          }
        });
      } else if (isPaid) {
        await tx.paymentTransaction.create({
          data: {
            collegeId,
            feeId: fee.id,
            gateway: payload.paymentMethod,
            gatewayRef: payload.feeType || 'Tuition Fee',
            amount: newAmountDue,
            status: 'success',
            paidAt: new Date()
          }
        });
      }
    }

    return fee;
  });

  const formatted = formatFeeRecord(updatedFee);
  logger.info(`[info] req=${req.id || ''} college=${collegeId} feeId=${id} actor=${actorId} Updated fee record`);
  res.json({ success: true, data: formatted });
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

  await prisma.$transaction(async (tx) => {
    // Delete any associated payment transactions first to maintain referential integrity
    await tx.paymentTransaction.deleteMany({
      where: { feeId: id }
    });

    await tx.fee.delete({ where: { id } });
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} feeId=${id} actor=${actorId} Deleted fee record`);
  res.json({ success: true, message: 'Fee record deleted successfully' });
};
