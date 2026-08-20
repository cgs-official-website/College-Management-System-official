import { prisma } from '../../server.js';

export const getFees = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const { status, studentId } = req.query;

    const where = { collegeId };
    if (status) where.status = status;
    if (studentId) where.studentId = studentId;

    const fees = await prisma.fee.findMany({
      where,
      include: {
        student: { select: { id: true, rollNumber: true, user: { select: { email: true } } } },
        feeStructure: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ data: fees });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

export const createFee = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const { studentId, feeStructureId, amountDue } = req.body;

    const fee = await prisma.fee.create({
      data: {
        collegeId,
        studentId,
        feeStructureId,
        amountDue,
      }
    });

    res.status(201).json({ data: fee });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};

export const updateFee = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const { id } = req.params;
    const { status, amountPaid } = req.body;

    const fee = await prisma.fee.update({
      where: { id, collegeId },
      data: {
        ...(status && { status }),
        ...(amountPaid !== undefined && { amountPaid })
      }
    });

    res.json({ data: fee });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};

export const deleteFee = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const { id } = req.params;

    await prisma.fee.delete({
      where: { id, collegeId }
    });

    res.json({ data: { success: true } });
  } catch (error) {
    res.status(400).json({ error: { message: error.message } });
  }
};
