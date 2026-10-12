import { prisma, logger } from '../../server.js';
import { restockSchema, adjustSchema } from './store.schema.js';

const ctx = (req) => ({
  collegeId: req.tenant?.collegeId || req.user?.collegeId,
  actorId: req.user?.id || req.user?.userId,
});

const httpError = (statusCode, code, message) =>
  Object.assign(new Error(message), { statusCode, code });

const plain = (i) => ({ ...i, price: Number(i.price) });

export const restockItem = async (req, res) => {
  const { collegeId, actorId } = ctx(req);
  const { id } = req.params;
  if (!collegeId) throw httpError(403, 'FORBIDDEN', 'Tenant context missing');

  const p = restockSchema.parse(req.body);

  const item = await prisma.$transaction(async (tx) => {
    const upd = await tx.storeItem.updateMany({
      where: { id, collegeId },
      data: { stock: { increment: p.quantity } },
    });
    if (upd.count === 0) throw httpError(404, 'NOT_FOUND', 'Store item not found');

    const fresh = await tx.storeItem.findUnique({ where: { id } });
    await tx.storeStockMovement.create({
      data: {
        collegeId,
        itemId: id,
        type: 'RESTOCK',
        quantity: p.quantity,
        balanceAfter: fresh.stock,
        note: p.note,
        byUserId: actorId || null,
      },
    });
    return fresh;
  });

  logger.info(`[info] college=${collegeId} actor=${actorId} Restocked store item ${id} +${p.quantity} -> ${item.stock}`);
  res.status(201).json({ success: true, data: plain(item) });
};

export const adjustItem = async (req, res) => {
  const { collegeId, actorId } = ctx(req);
  const { id } = req.params;
  if (!collegeId) throw httpError(403, 'FORBIDDEN', 'Tenant context missing');

  const p = adjustSchema.parse(req.body);

  const item = await prisma.$transaction(async (tx) => {
    const cur = await tx.storeItem.findFirst({ where: { id, collegeId } });
    if (!cur) throw httpError(404, 'NOT_FOUND', 'Store item not found');

    const delta = p.newStock - cur.stock;
    if (delta === 0) throw httpError(400, 'NO_CHANGE', `Stock is already ${cur.stock}`);

    const upd = await tx.storeItem.updateMany({
      where: { id, collegeId, stock: cur.stock },
      data: { stock: p.newStock },
    });
    if (upd.count === 0) {
      throw httpError(409, 'STOCK_CHANGED', 'Stock changed while you were editing. Refresh and try again.');
    }

    await tx.storeStockMovement.create({
      data: {
        collegeId,
        itemId: id,
        type: 'ADJUST',
        quantity: delta, 
        balanceAfter: p.newStock,
        note: p.note,
        byUserId: actorId || null,
      },
    });
    return { ...cur, stock: p.newStock };
  });

  logger.info(`[info] college=${collegeId} actor=${actorId} Adjusted store item ${id} -> ${item.stock}`);
  res.status(201).json({ success: true, data: plain(item) });
};

export const getMovements = async (req, res) => {
  const { collegeId } = ctx(req);
  const { id } = req.params;
  if (!collegeId) throw httpError(403, 'FORBIDDEN', 'Tenant context missing');

  const item = await prisma.storeItem.findFirst({ where: { id, collegeId }, select: { id: true } });
  if (!item) throw httpError(404, 'NOT_FOUND', 'Store item not found');

  const rows = await prisma.storeStockMovement.findMany({
    where: { collegeId, itemId: id },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const userIds = [...new Set(rows.map((r) => r.byUserId).filter(Boolean))];
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
    : [];
  const names = new Map(users.map((u) => [u.id, u.name || u.email]));

  res.json({
    success: true,
    data: rows.map((r) => ({
      ...r,
      byName: r.byUserId ? names.get(r.byUserId) || 'Unknown' : 'System',
    })),
  });
};