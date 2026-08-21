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
          user: { select: { email: true } }
        }
      },
      feeStructure: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ success: true, data: fees });
};

export const createFee = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { studentId, feeStructureId, amountDue } = req.body;

  const fee = await prisma.fee.create({
    data: {
      collegeId,
      studentId,
      feeStructureId,
      amountDue: Number(amountDue),
    }
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} feeId=${fee.id} actor=${actorId} Created fee record`);
  res.status(201).json({ success: true, data: fee });
};

export const updateFee = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { id } = req.params;
  const { status, amountPaid } = req.body;

  const existing = await prisma.fee.findFirst({
    where: { id, collegeId }
  });

  if (!existing) {
    return res.status(404).json({ success: false, error: { code: 'FEE_NOT_FOUND', message: 'Fee record not found' } });
  }

  const fee = await prisma.fee.update({
    where: { id },
    data: {
      ...(status && { status }),
      ...(amountPaid !== undefined && { amountPaid: Number(amountPaid) })
    }
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} feeId=${id} actor=${actorId} Updated fee record`);
  res.json({ success: true, data: fee });
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
