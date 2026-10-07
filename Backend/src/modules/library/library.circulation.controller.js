import { prisma, logger } from '../../server.js';

const DAY_MS = 24 * 60 * 60 * 1000;

class CircError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (err) {
    if (err instanceof CircError) {
      return res.status(err.status).json({ success: false, error: { code: err.code, message: err.message } });
    }
    throw err;
  }
};

const ctx = (req) => ({
  collegeId: req.tenant?.collegeId || req.user?.collegeId,
  actorId: req.user?.id || req.user?.userId,
});

const getSettings = async (db, collegeId) => {
  const s = await db.librarySettings.findUnique({ where: { collegeId } });
  return {
    loanDays: s?.loanDays ?? 14,
    maxBooksPerStudent: s?.maxBooksPerStudent ?? 3,
    maxRenewals: s?.maxRenewals ?? 2,
    graceDays: s?.graceDays ?? 0,
    finePerDay: Number(s?.finePerDay ?? 2),
  };
};

const calcLateDays = (dueDate, returnDate, graceDays) => {
  const diff = Math.ceil((returnDate.getTime() - dueDate.getTime()) / DAY_MS);
  return Math.max(0, diff - graceDays);
};

const withLiveFine = (txn, settings, now = new Date()) => {
  if (txn.status !== 'ISSUED') return { ...txn, isOverdue: false, accruingFine: 0 };
  const lateDays = calcLateDays(txn.dueDate, now, settings.graceDays);
  return { ...txn, isOverdue: txn.dueDate < now, accruingFine: lateDays * settings.finePerDay };
};

const studentSelect = {
  id: true,
  rollNumber: true,
  admissionNumber: true,
  yearOfStudy: true,
  batchYear: true,
  user: { select: { name: true, email: true } },
  department: { select: { name: true } },
  course: { select: { name: true } },
  section: { select: { name: true } },
};

// ---------- ISSUE ----------
export const issueBook = handle(async (req, res) => {
  const { collegeId, actorId } = ctx(req);
  const { bookId, studentId, dueDate: dueOverride, remarks } = req.body;

  if (!bookId || !studentId) {
    throw new CircError(400, 'MISSING_FIELDS', 'bookId and studentId are required');
  }

  const txn = await prisma.$transaction(async (tx) => {
    const settings = await getSettings(tx, collegeId);
    const now = new Date();

    const student = await tx.student.findFirst({ where: { id: studentId, collegeId, deletedAt: null } });
    if (!student) throw new CircError(404, 'STUDENT_NOT_FOUND', 'Student not found');

    const book = await tx.libraryItem.findFirst({ where: { id: bookId, collegeId } });
    if (!book) throw new CircError(404, 'BOOK_NOT_FOUND', 'Book not found');

    const activeLoans = await tx.libraryTransaction.findMany({
      where: { collegeId, studentId, status: 'ISSUED' },
      select: { bookId: true, dueDate: true },
    });

    if (activeLoans.length >= settings.maxBooksPerStudent) {
      throw new CircError(409, 'LIMIT_REACHED', `Student already has ${activeLoans.length} books (limit ${settings.maxBooksPerStudent})`);
    }
    if (activeLoans.some((l) => l.dueDate < now)) {
      throw new CircError(409, 'HAS_OVERDUE', 'Student has overdue books. Return them before borrowing again');
    }
    if (activeLoans.some((l) => l.bookId === bookId)) {
      throw new CircError(409, 'DUPLICATE_TITLE', 'Student already holds a copy of this book');
    }

    const dec = await tx.libraryItem.updateMany({
      where: { id: bookId, collegeId, availableCopies: { gt: 0 } },
      data: { availableCopies: { decrement: 1 } },
    });
    if (dec.count === 0) throw new CircError(409, 'NO_COPIES', 'No copies available');

    const dueDate = dueOverride ? new Date(dueOverride) : new Date(now.getTime() + settings.loanDays * DAY_MS);
    if (isNaN(dueDate) || dueDate <= now) throw new CircError(400, 'INVALID_DUE_DATE', 'Due date must be in the future');

    return tx.libraryTransaction.create({
      data: { collegeId, bookId, studentId, issuedById: actorId, issueDate: now, dueDate, remarks: remarks || null },
      include: { book: { select: { id: true, title: true, author: true } } },
    });
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} txn=${txn.id} actor=${actorId} Issued book ${bookId} to student ${studentId}`);
  res.status(201).json({ success: true, data: txn });
});

// ---------- RETURN ----------
export const returnBook = handle(async (req, res) => {
  const { collegeId, actorId } = ctx(req);
  const { id } = req.params;
  const condition = req.body.condition || 'GOOD'; // GOOD | DAMAGED | LOST
  const { remarks } = req.body;

  if (!['GOOD', 'DAMAGED', 'LOST'].includes(condition)) {
    throw new CircError(400, 'INVALID_CONDITION', 'condition must be GOOD, DAMAGED or LOST');
  }

  const result = await prisma.$transaction(async (tx) => {
    const settings = await getSettings(tx, collegeId);
    const txn = await tx.libraryTransaction.findFirst({
      where: { id, collegeId },
      include: { book: true },
    });
    if (!txn) throw new CircError(404, 'TXN_NOT_FOUND', 'Transaction not found');
    if (txn.status !== 'ISSUED') throw new CircError(409, 'ALREADY_CLOSED', 'This loan is already closed');
    if (condition === 'LOST' && !(Number(txn.book.price) > 0)) {
      throw new CircError(409, 'PRICE_MISSING', 'This book has no price. Set its price in Inventory before marking it lost.');
    }

    const now = new Date();
    const lateDays = calcLateDays(txn.dueDate, now, settings.graceDays);
    let fine = lateDays * settings.finePerDay;
    const isLost = condition === 'LOST';
    if (isLost) fine += Number(txn.book.price || 0);

    const closed = await tx.libraryTransaction.updateMany({
      where: { id, collegeId, status: 'ISSUED' },
      data: {
        status: isLost ? 'LOST' : 'RETURNED',
        returnDate: now,
        receivedById: actorId,
        condition,
        lateDays,
        fineAmount: fine,
        remarks: remarks ?? txn.remarks,
      },
    });
    if (closed.count === 0) throw new CircError(409, 'ALREADY_CLOSED', 'This loan is already closed');

    if (!isLost) {
      await tx.libraryItem.update({ where: { id: txn.bookId }, data: { availableCopies: { increment: 1 } } });
    }

    return tx.libraryTransaction.findUnique({
      where: { id },
      include: { book: { select: { id: true, title: true, author: true } } },
    });
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} txn=${id} actor=${actorId} Returned (${condition}) fine=${result.fineAmount}`);
  res.json({ success: true, data: result });
});

// ---------- RENEW ----------
export const renewBook = handle(async (req, res) => {
  const { collegeId, actorId } = ctx(req);
  const { id } = req.params;

  const settings = await getSettings(prisma, collegeId);
  const txn = await prisma.libraryTransaction.findFirst({ where: { id, collegeId } });

  if (!txn) throw new CircError(404, 'TXN_NOT_FOUND', 'Transaction not found');
  if (txn.status !== 'ISSUED') throw new CircError(409, 'ALREADY_CLOSED', 'Only active loans can be renewed');
  if (txn.dueDate < new Date()) throw new CircError(409, 'OVERDUE', 'Overdue books cannot be renewed. Return it first');
  if (txn.renewCount >= settings.maxRenewals) {
    throw new CircError(409, 'RENEW_LIMIT', `Renewal limit (${settings.maxRenewals}) reached`);
  }

  const updated = await prisma.libraryTransaction.update({
    where: { id },
    data: {
      dueDate: new Date(txn.dueDate.getTime() + settings.loanDays * DAY_MS),
      renewCount: { increment: 1 },
    },
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} txn=${id} actor=${actorId} Renewed loan`);
  res.json({ success: true, data: updated });
});

// ---------- LIST TRANSACTIONS ----------
export const listTransactions = handle(async (req, res) => {
  const { collegeId } = ctx(req);
  const { status, overdue, studentId, bookId, from, to } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

  const where = { collegeId };
  if (status) where.status = status;
  if (studentId) where.studentId = studentId;
  if (bookId) where.bookId = bookId;
  if (overdue === 'true') {
    where.status = 'ISSUED';
    where.dueDate = { lt: new Date() };
  }
  if (from || to) {
    where.issueDate = {};
    if (from) where.issueDate.gte = new Date(from);
    if (to) where.issueDate.lte = new Date(to);
  }

  const [settings, total, rows] = await Promise.all([
    getSettings(prisma, collegeId),
    prisma.libraryTransaction.count({ where }),
    prisma.libraryTransaction.findMany({
      where,
      orderBy: { issueDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        book: { select: { id: true, title: true, author: true, isbn: true, price: true } },
        student: { select: studentSelect },
      },
    }),
  ]);

  res.json({
    success: true,
    data: rows.map((r) => withLiveFine(r, settings)),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// ---------- STUDENT SUMMARY ----------
export const getStudentSummary = handle(async (req, res) => {
  const { collegeId } = ctx(req);
  const { studentId } = req.params;

  const student = await prisma.student.findFirst({
    where: { id: studentId, collegeId, deletedAt: null },
    select: studentSelect,
  });
  if (!student) throw new CircError(404, 'STUDENT_NOT_FOUND', 'Student not found');

  const settings = await getSettings(prisma, collegeId);
  const now = new Date();

  const [active, fines] = await Promise.all([
    prisma.libraryTransaction.findMany({
      where: { collegeId, studentId, status: 'ISSUED' },
      include: { book: { select: { id: true, title: true, author: true } } },
      orderBy: { dueDate: 'asc' },
    }),
    prisma.libraryTransaction.aggregate({
      where: { collegeId, studentId, finePaid: false, fineWaived: false, fineAmount: { gt: 0 } },
      _sum: { fineAmount: true },
    }),
  ]);

  const activeLoans = active.map((l) => withLiveFine(l, settings, now));
  const overdueCount = activeLoans.filter((l) => l.isOverdue).length;

  let blockedReason = null;
  if (activeLoans.length >= settings.maxBooksPerStudent) blockedReason = 'Borrow limit reached';
  else if (overdueCount > 0) blockedReason = 'Has overdue books';

  res.json({
    success: true,
    data: {
      student,
      activeLoans,
      overdueCount,
      pendingFines: Number(fines._sum.fineAmount || 0),
      limit: settings.maxBooksPerStudent,
      canBorrow: !blockedReason,
      blockedReason,
    },
  });
});

// ---------- SETTINGS ----------
export const getLibrarySettings = handle(async (req, res) => {
  const { collegeId } = ctx(req);
  res.json({ success: true, data: await getSettings(prisma, collegeId) });
});

export const updateLibrarySettings = handle(async (req, res) => {
  const { collegeId, actorId } = ctx(req);

  const rules = {
    loanDays: { min: 1, int: true },
    maxBooksPerStudent: { min: 1, int: true },
    maxRenewals: { min: 0, int: true },
    graceDays: { min: 0, int: true },
    finePerDay: { min: 0, int: false },
  };

  const data = {};
  for (const [key, rule] of Object.entries(rules)) {
    const v = req.body[key];
    if (v === undefined) continue;
    const n = Number(v);
    if (!Number.isFinite(n) || n < rule.min || (rule.int && !Number.isInteger(n))) {
      throw new CircError(400, 'INVALID_SETTING', `${key} must be ${rule.int ? 'a whole number' : 'a number'} of at least ${rule.min}`);
    }
    data[key] = n;
  }

  if (Object.keys(data).length === 0) {
    throw new CircError(400, 'NO_CHANGES', 'No settings provided');
  }

  await prisma.librarySettings.upsert({
    where: { collegeId },
    update: data,
    create: { collegeId, ...data },
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} actor=${actorId} Updated library settings`);
  res.json({ success: true, data: await getSettings(prisma, collegeId) });
});

export const searchStudents = handle(async (req, res) => {
  const { collegeId } = ctx(req);
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ success: true, data: [] });

  const students = await prisma.student.findMany({
    where: {
      collegeId,
      deletedAt: null,
      OR: [
        { rollNumber: { contains: q, mode: 'insensitive' } },
        { admissionNumber: { contains: q, mode: 'insensitive' } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
      ],
    },
    select: studentSelect,
    take: 10,
  });

  res.json({ success: true, data: students });
});