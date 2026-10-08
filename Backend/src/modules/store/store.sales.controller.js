import { Prisma } from '@prisma/client';
import { prisma, logger } from '../../server.js';
import { createSaleSchema } from './store.schema.js';

const ctx = (req) => ({
  collegeId: req.tenant?.collegeId || req.user?.collegeId,
  actorId: req.user?.id || req.user?.userId,
});

const httpError = (statusCode, code, message) =>
  Object.assign(new Error(message), { statusCode, code });

const D = (v) => new Prisma.Decimal(v);

const serializeSale = (s) => ({
  ...s,
  subtotal: Number(s.subtotal),
  discount: Number(s.discount),
  total: Number(s.total),
  items: (s.items || []).map((i) => ({
    ...i,
    unitPrice: Number(i.unitPrice),
    lineTotal: Number(i.lineTotal),
  })),
});

// ---------------------------------------------------------------
// POST /store/sales
// ---------------------------------------------------------------
export const createSale = async (req, res) => {
  const { collegeId, actorId } = ctx(req);
  if (!collegeId) throw httpError(403, 'FORBIDDEN', 'Tenant context missing');

  const p = createSaleSchema.parse(req.body);

  let department = null;
  if (p.customerType !== 'OTHER') {
    const dep = await prisma.department.findFirst({
      where: { collegeId, name: { equals: p.department, mode: 'insensitive' } },
    });
    if (!dep) throw httpError(400, 'INVALID_DEPARTMENT', `Department '${p.department}' not found`);
    department = dep.name;
  }

  const wanted = new Map();
  for (const l of p.items) wanted.set(l.itemId, (wanted.get(l.itemId) || 0) + l.quantity);
  const lines = [...wanted.entries()].sort(([a], [b]) => (a < b ? -1 : 1));

  const discountNum = Math.round(p.discount * 100) / 100;
  const year = new Date().getFullYear();
  const createdByName = req.user?.name || req.user?.email || null;

  // Make sure this year's counter row exists 
  await prisma.storeInvoiceCounter.createMany({
    data: [{ collegeId, year, lastNo: 0 }],
    skipDuplicates: true,
  });

  const sale = await prisma.$transaction(async (tx) => {
    // 1) decrement stock, only if enough remains
    const sold = [];
    for (const [itemId, qty] of lines) {
      const upd = await tx.storeItem.updateMany({
        where: { id: itemId, collegeId, isActive: true, stock: { gte: qty } },
        data: { stock: { decrement: qty } },
      });

      if (upd.count === 0) {
        const it = await tx.storeItem.findFirst({ where: { id: itemId, collegeId } });
        if (!it) throw httpError(404, 'ITEM_NOT_FOUND', 'An item in this sale no longer exists. Refresh and try again.');
        if (!it.isActive) throw httpError(409, 'ITEM_INACTIVE', `'${it.name}' is inactive and cannot be sold`);
        throw httpError(
          409, 'INSUFFICIENT_STOCK',
          it.stock <= 0
            ? `'${it.name}' is out of stock`
            : `Only ${it.stock} of '${it.name}' left in stock (requested ${qty})`
        );
      }

      const fresh = await tx.storeItem.findUnique({ where: { id: itemId } });
      sold.push({ item: fresh, qty });
    }

    // 2) totals (Decimal math, no float drift)
    let subtotal = D(0);
    const saleItems = sold.map(({ item, qty }) => {
      const lineTotal = item.price.mul(qty);
      subtotal = subtotal.add(lineTotal);
      return { itemId: item.id, name: item.name, quantity: qty, unitPrice: item.price, lineTotal };
    });

    const discount = D(discountNum);
    if (discount.gt(subtotal)) {
      throw httpError(400, 'INVALID_DISCOUNT', 'Discount cannot be more than the subtotal');
    }
    const total = subtotal.sub(discount);

    // 3) next invoice number 
    const counter = await tx.storeInvoiceCounter.update({
      where: { collegeId_year: { collegeId, year } },
      data: { lastNo: { increment: 1 } },
    });
    const invoiceNo = `STR-${year}-${String(counter.lastNo).padStart(6, '0')}`;

    // 4) sale + lines
    const created = await tx.storeSale.create({
      data: {
        collegeId,
        invoiceNo,
        customerType: p.customerType,
        customerName: p.customerName,
        rollNo: p.customerType === 'STUDENT' ? (p.rollNo ?? null) : null,
        department,
        year: p.customerType === 'STUDENT' ? p.year : null,
        section: p.customerType === 'STUDENT' ? p.section : null,
        subtotal,
        discount,
        total,
        paymentMethod: p.paymentMethod,
        paymentRef: p.paymentMethod === 'CASH' ? null : (p.paymentRef ?? null),
        createdById: actorId || null,
        createdByName,
        items: { create: saleItems },
      },
      include: { items: true },
    });

    // 5) stock movements
    await tx.storeStockMovement.createMany({
      data: sold.map(({ item, qty }) => ({
        collegeId,
        itemId: item.id,
        type: 'SALE',
        quantity: -qty,
        balanceAfter: item.stock,
        refId: created.id,
        note: `Sale ${invoiceNo}`,
        byUserId: actorId || null,
      })),
    });

    return created;
  }, { maxWait: 15000, timeout: 30000 });

  logger.info(`[info] college=${collegeId} actor=${actorId} Store sale ${sale.invoiceNo} total=${sale.total}`);
  res.status(201).json({ success: true, data: serializeSale(sale) });
};

// ---------------------------------------------------------------
// GET /store/sales  (filters + paging + totals)
// ---------------------------------------------------------------
const IST = '+05:30'; 
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CUSTOMER_TYPES = ['STUDENT', 'STAFF', 'OTHER'];
const PAYMENT_METHODS = ['CASH', 'UPI', 'CARD'];

const parseDay = (value, endOfDay, label) => {
  if (!DATE_RE.test(value)) throw httpError(400, 'INVALID_DATE', `${label} must be YYYY-MM-DD`);
  const d = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}${IST}`);
  if (Number.isNaN(d.getTime())) throw httpError(400, 'INVALID_DATE', `${label} is not a valid date`);
  return d;
};

const buildWhere = (collegeId, q) => {
  const { from, to, customerType, department, year, section, paymentMethod, search } = q;

  if (customerType && !CUSTOMER_TYPES.includes(customerType)) {
    throw httpError(400, 'INVALID_FILTER', 'Invalid customer type');
  }
  if (paymentMethod && !PAYMENT_METHODS.includes(paymentMethod)) {
    throw httpError(400, 'INVALID_FILTER', 'Invalid payment method');
  }

  const createdAt = {};
  if (from) createdAt.gte = parseDay(String(from), false, 'from');
  if (to) createdAt.lte = parseDay(String(to), true, 'to');

  return {
    collegeId,
    ...(from || to ? { createdAt } : {}),
    ...(customerType ? { customerType } : {}),
    ...(department ? { department: { equals: String(department), mode: 'insensitive' } } : {}),
    ...(year ? { year: String(year) } : {}),
    ...(section ? { section: { equals: String(section), mode: 'insensitive' } } : {}),
    ...(paymentMethod ? { paymentMethod } : {}),
    ...(search ? {
      OR: [
        { customerName: { contains: String(search), mode: 'insensitive' } },
        { invoiceNo: { contains: String(search), mode: 'insensitive' } },
        { rollNo: { contains: String(search), mode: 'insensitive' } },
      ],
    } : {}),
  };
};

export const getSales = async (req, res) => {
  const { collegeId } = ctx(req);
  if (!collegeId) throw httpError(403, 'FORBIDDEN', 'Tenant context missing');

  const where = buildWhere(collegeId, req.query);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100);

  const [total, rows, agg, byPay] = await Promise.all([
    prisma.storeSale.count({ where }),
    prisma.storeSale.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.storeSale.aggregate({ where, _sum: { total: true, discount: true } }),
    prisma.storeSale.groupBy({
      by: ['paymentMethod'],
      where,
      _sum: { total: true },
      _count: { _all: true },
    }),
  ]);

  const byPayment = { CASH: { count: 0, amount: 0 }, UPI: { count: 0, amount: 0 }, CARD: { count: 0, amount: 0 } };
  for (const g of byPay) {
    byPayment[g.paymentMethod] = { count: g._count._all, amount: Number(g._sum.total || 0) };
  }

  res.json({
    success: true,
    data: rows.map(serializeSale),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      summary: {
        count: total,
        totalAmount: Number(agg._sum.total || 0),
        totalDiscount: Number(agg._sum.discount || 0),
        byPayment,
      },
    },
  });
};

// ---------------------------------------------------------------
// GET /store/sales/:id
// ---------------------------------------------------------------
export const getSaleById = async (req, res) => {
  const { collegeId } = ctx(req);
  if (!collegeId) throw httpError(403, 'FORBIDDEN', 'Tenant context missing');

  const sale = await prisma.storeSale.findFirst({
    where: { id: req.params.id, collegeId },
    include: { items: true },
  });
  if (!sale) throw httpError(404, 'NOT_FOUND', 'Sale not found');

  res.json({ success: true, data: serializeSale(sale) });
};