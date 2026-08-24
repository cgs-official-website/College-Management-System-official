import { prisma, logger } from '../../server.js';
import { invalidateCachePattern } from '../../lib/cache.js';
import { stockMovementSchema } from './inventory.schema.js';

export const getAuditLogs = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  if (!collegeId) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Tenant context missing' } });
  }

  const {
    movementType,
    inventoryItemId,
    categoryId,
    search,
    startDate,
    endDate,
    page = 1,
    limit = 50,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = limit !== undefined ? parseInt(limit, 10) : 50;
  const skip = (pageNum - 1) * (limitNum || 0);

  const where = {
    collegeId,
    ...(movementType ? { movementType } : {}),
    ...(inventoryItemId ? { inventoryItemId } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(startDate || endDate ? {
      createdAt: {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {})
      }
    } : {}),
    ...(search ? {
      OR: [
        { reason: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { referenceId: { contains: search, mode: 'insensitive' } },
        { inventoryItem: { name: { contains: search, mode: 'insensitive' } } },
        { inventoryItem: { sku: { contains: search, mode: 'insensitive' } } },
        { category: { name: { contains: search, mode: 'insensitive' } } }
      ]
    } : {})
  };

  const [total, logs] = await Promise.all([
    prisma.inventoryAuditLog.count({ where }),
    prisma.inventoryAuditLog.findMany({
      where,
      include: {
        inventoryItem: {
          select: {
            id: true,
            name: true,
            sku: true,
            categoryId: true,
            quantity: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        performedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc' },
      ...(limitNum > 0 ? { skip, take: limitNum } : {})
    })
  ]);

  const formatted = logs.map(log => ({
    id: log.id,
    collegeId: log.collegeId,
    movementType: log.movementType,
    quantity: Number(log.quantity),
    reason: log.reason,
    notes: log.notes,
    referenceType: log.referenceType,
    referenceId: log.referenceId,
    createdAt: log.createdAt,
    inventoryItem: log.inventoryItem,
    category: log.category,
    performedBy: log.performedBy
      ? {
          id: log.performedBy.id,
          name: log.performedBy.name || log.performedBy.email.split('@')[0],
          email: log.performedBy.email,
          role: log.performedBy.role
        }
      : null
  }));

  res.json({
    success: true,
    data: formatted,
    meta: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: limitNum > 0 ? Math.ceil(total / limitNum) : 1
    }
  });
};

export const getInboundLogs = async (req, res) => {
  req.query.movementType = 'INBOUND';
  return getAuditLogs(req, res);
};

export const getOutboundLogs = async (req, res) => {
  req.query.movementType = 'OUTBOUND';
  return getAuditLogs(req, res);
};

export const createStockMovement = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;

  if (!collegeId) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Tenant context missing' } });
  }

  const payload = stockMovementSchema.parse(req.body);

  // 1. Verify item exists and belongs to this college
  const item = await prisma.inventoryItem.findFirst({
    where: { id: payload.inventoryItemId, collegeId },
    include: { productCategory: true }
  });

  if (!item) {
    return res.status(404).json({
      success: false,
      error: { code: 'ITEM_NOT_FOUND', message: 'Inventory item not found in your college' }
    });
  }

  // 2. If Outbound, validate stock availability
  if (payload.movementType === 'OUTBOUND') {
    if (item.quantity < payload.quantity) {
      logger.warn(`[warn] college=${collegeId} actor=${actorId} Outbound movement rejected: requested=${payload.quantity}, available=${item.quantity}`);
      return res.status(409).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_STOCK',
          message: `Insufficient inventory stock for this outbound operation. Available: ${item.quantity}, Requested: ${payload.quantity}.`
        }
      });
    }
  }

  // 3. Execute atomic transaction (Stock update + Audit log creation)
  const result = await prisma.$transaction(async (tx) => {
    const updatedItem = await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        quantity: payload.movementType === 'INBOUND'
          ? { increment: Math.round(payload.quantity) }
          : { decrement: Math.round(payload.quantity) }
      },
      include: {
        productCategory: {
          select: { id: true, name: true, code: true }
        }
      }
    });

    const auditLog = await tx.inventoryAuditLog.create({
      data: {
        collegeId,
        inventoryItemId: item.id,
        categoryId: item.categoryId || null,
        movementType: payload.movementType,
        quantity: payload.quantity,
        reason: payload.reason,
        notes: payload.notes || null,
        referenceType: payload.referenceType || null,
        referenceId: payload.referenceId || null,
        performedById: actorId || null
      },
      include: {
        inventoryItem: {
          select: { id: true, name: true, sku: true }
        },
        category: {
          select: { id: true, name: true, code: true }
        },
        performedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return { updatedItem, auditLog };
  });

  await Promise.all([
    invalidateCachePattern(`inventory:items:${collegeId}:*`),
    invalidateCachePattern(`inventory:categories:${collegeId}:*`)
  ]);

  logger.info(`[info] college=${collegeId} actor=${actorId} Recorded ${payload.movementType} movement for item id=${item.id} qty=${payload.quantity} reason='${payload.reason}'`);

  res.status(201).json({
    success: true,
    data: {
      item: result.updatedItem,
      auditLog: {
        ...result.auditLog,
        quantity: Number(result.auditLog.quantity)
      }
    }
  });
};
