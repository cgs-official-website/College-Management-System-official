import { prisma, logger } from '../../server.js';
import { termSchema, updateTermSchema } from './transport.schema.js';

const getCollegeId = (req) => req.tenant?.collegeId || req.user?.collegeId;
const fail = (res, status, message) => res.status(status).json({ success: false, error: { message } });

const shape = (t) => ({
  id: t.id,
  label: t.label,
  semester: t.semester,
  dueDate: t.dueDate,
  isCurrent: t.isCurrent,
  feesCount: t._count?.fees ?? 0,
});

const withCount = { _count: { select: { fees: true } } };

export const getTerms = async (req, res) => {
  const collegeId = getCollegeId(req);
  if (!collegeId) return fail(res, 400, 'College ID is required');

  const terms = await prisma.transportFeeTerm.findMany({
    where: { collegeId },
    include: withCount,
    orderBy: { dueDate: 'desc' },
  });
  const data = terms.map(shape);
  res.json({ success: true, data, stats: { total: data.length, current: data.find((t) => t.isCurrent)?.label || null } });
};

export const createTerm = async (req, res) => {
  const collegeId = getCollegeId(req);
  const payload = termSchema.parse(req.body);

  try {
    const term = await prisma.$transaction(async (tx) => {
      if (payload.isCurrent) {
        await tx.transportFeeTerm.updateMany({ where: { collegeId, isCurrent: true }, data: { isCurrent: false } });
      }
      return tx.transportFeeTerm.create({ data: { ...payload, collegeId }, include: withCount });
    });
    logger.info(`[info] college=${collegeId} Created fee term ${term.label}`);
    res.status(201).json({ success: true, data: shape(term) });
  } catch (e) {
    if (e.code === 'P2002') return fail(res, 409, 'A term with this label already exists');
    throw e;
  }
};

export const updateTerm = async (req, res) => {
  const collegeId = getCollegeId(req);
  const { id } = req.params;
  const payload = updateTermSchema.parse(req.body);

  const existing = await prisma.transportFeeTerm.findFirst({ where: { id, collegeId } });
  if (!existing) return fail(res, 404, 'Term not found');

  try {
    const term = await prisma.transportFeeTerm.update({ where: { id }, data: payload, include: withCount });
    res.json({ success: true, data: shape(term) });
  } catch (e) {
    if (e.code === 'P2002') return fail(res, 409, 'A term with this label already exists');
    throw e;
  }
};

export const setCurrentTerm = async (req, res) => {
  const collegeId = getCollegeId(req);
  const { id } = req.params;

  const existing = await prisma.transportFeeTerm.findFirst({ where: { id, collegeId } });
  if (!existing) return fail(res, 404, 'Term not found');

  await prisma.$transaction(async (tx) => {
    await tx.transportFeeTerm.updateMany({ where: { collegeId, isCurrent: true }, data: { isCurrent: false } });
    await tx.transportFeeTerm.update({ where: { id }, data: { isCurrent: true } });
  });

  logger.info(`[info] college=${collegeId} Current fee term set to ${existing.label}`);
  res.json({ success: true, message: 'Current term updated' });
};

export const deleteTerm = async (req, res) => {
  const collegeId = getCollegeId(req);
  const { id } = req.params;

  const existing = await prisma.transportFeeTerm.findFirst({ where: { id, collegeId }, include: withCount });
  if (!existing) return fail(res, 404, 'Term not found');
  if (existing._count.fees > 0) {
    return fail(res, 409, `${existing._count.fees} fee(s) were created under this term, so it can't be deleted.`);
  }

  await prisma.transportFeeTerm.delete({ where: { id } });
  res.json({ success: true, message: 'Term deleted successfully' });
};

export const generateTermFees = async (req, res) => {
  const collegeId = getCollegeId(req);
  const { id } = req.params;

  const term = await prisma.transportFeeTerm.findFirst({ where: { id, collegeId } });
  if (!term) return fail(res, 404, 'Term not found');

  const result = await prisma.$transaction(
    async (tx) => {
      const allocs = await tx.studentTransportAllocation.findMany({
        where: { collegeId, student: { deletedAt: null, transportRequired: 'Yes' } },
        select: {
          id: true,
          studentId: true,
          stop: { select: { fee: true } },
          fees: { where: { termId: id, feeType: 'Transport Fee' }, select: { id: true } },
        },
      });

      const alreadyHad = allocs.filter((a) => a.fees.length > 0).length;
      const pending = allocs.filter((a) => a.fees.length === 0);
      const zeroFee = pending.filter((a) => Number(a.stop.fee) <= 0).length;
      const todo = pending.filter((a) => Number(a.stop.fee) > 0);

      // one FeeStructure per distinct amount
      const structureByAmount = new Map();
      for (const amount of new Set(todo.map((a) => Number(a.stop.fee)))) {
        let structure = await tx.feeStructure.findFirst({
          where: { collegeId, semester: term.semester, departmentId: null, totalAmount: amount, dueDate: term.dueDate },
        });
        if (!structure) {
          structure = await tx.feeStructure.create({
            data: { collegeId, semester: term.semester, departmentId: null, totalAmount: amount, dueDate: term.dueDate },
          });
        }
        structureByAmount.set(amount, structure.id);
      }

      const created = todo.length
        ? await tx.fee.createMany({
            data: todo.map((a) => {
              const amount = Number(a.stop.fee);
              return {
                collegeId,
                studentId: a.studentId,
                feeStructureId: structureByAmount.get(amount),
                status: 'pending',
                amountDue: amount,
                amountPaid: 0,
                feeType: 'Transport Fee',
                termId: id,
                allocationId: a.id,
              };
            }),
            skipDuplicates: true,
          })
        : { count: 0 };

      return { created: created.count, alreadyHad, zeroFee, totalAssigned: allocs.length };
    },
    { timeout: 60000, maxWait: 10000 }
  );

  logger.info(`[info] college=${collegeId} Generated transport fees for ${term.label}: ${result.created} created`);
  res.json({ success: true, data: { ...result, termLabel: term.label } });
};