import { prisma, logger } from '../../server.js';
import { createStoreCategorySchema, updateStoreCategorySchema } from './store.schema.js';

const ctx = (req) => ({
  collegeId: req.tenant?.collegeId || req.user?.collegeId,
  actorId: req.user?.id || req.user?.userId,
});

const httpError = (statusCode, code, message) =>
  Object.assign(new Error(message), { statusCode, code });

const format = (c) => ({
  id: c.id,
  name: c.name,
  code: c.code,
  description: c.description,
  isActive: c.isActive,
  itemCount: c._count?.items ?? 0,
  createdAt: c.createdAt,
});

const assertUnique = async (collegeId, { name, code }, excludeId) => {
  const notSelf = excludeId ? { id: { not: excludeId } } : {};
  if (name) {
    const dup = await prisma.storeCategory.findFirst({
      where: { collegeId, ...notSelf, name: { equals: name, mode: 'insensitive' } },
    });
    if (dup) throw httpError(409, 'DUPLICATE_CATEGORY_NAME', `Category '${name}' already exists`);
  }
  if (code) {
    const dup = await prisma.storeCategory.findFirst({
      where: { collegeId, ...notSelf, code: { equals: code, mode: 'insensitive' } },
    });
    if (dup) throw httpError(409, 'DUPLICATE_CATEGORY_CODE', `Category code '${code}' already exists`);
  }
};

export const getCategories = async (req, res) => {
  const { collegeId } = ctx(req);
  if (!collegeId) throw httpError(403, 'FORBIDDEN', 'Tenant context missing');

  const rows = await prisma.storeCategory.findMany({
    where: { collegeId },
    include: { _count: { select: { items: true } } },
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, data: rows.map(format) });
};

export const createCategory = async (req, res) => {
  const { collegeId, actorId } = ctx(req);
  if (!collegeId) throw httpError(403, 'FORBIDDEN', 'Tenant context missing');

  const p = createStoreCategorySchema.parse(req.body);
  await assertUnique(collegeId, p);

  const cat = await prisma.storeCategory.create({
    data: {
      collegeId,
      name: p.name,
      code: p.code,
      description: p.description ?? null,
      isActive: p.isActive ?? true,
    },
    include: { _count: { select: { items: true } } },
  });

  logger.info(`[info] college=${collegeId} actor=${actorId} Created store category ${cat.id}`);
  res.status(201).json({ success: true, data: format(cat) });
};

export const updateCategory = async (req, res) => {
  const { collegeId, actorId } = ctx(req);
  const { id } = req.params;
  if (!collegeId) throw httpError(403, 'FORBIDDEN', 'Tenant context missing');

  const parsed = updateStoreCategorySchema.parse(req.body);
  const data = Object.fromEntries(Object.entries(parsed).filter(([, v]) => v !== undefined));

  const existing = await prisma.storeCategory.findFirst({ where: { id, collegeId } });
  if (!existing) throw httpError(404, 'NOT_FOUND', 'Category not found');

  await assertUnique(
    collegeId,
    {
      name: data.name && data.name.toLowerCase() !== existing.name.toLowerCase() ? data.name : null,
      code: data.code && data.code !== existing.code ? data.code : null,
    },
    id
  );

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.storeCategory.update({
      where: { id },
      data,
      include: { _count: { select: { items: true } } },
    });
    if (data.name && data.name !== existing.name) {
      await tx.storeItem.updateMany({ where: { collegeId, categoryId: id }, data: { category: data.name } });
    }
    return u;
  });

  logger.info(`[info] college=${collegeId} actor=${actorId} Updated store category ${id}`);
  res.json({ success: true, data: format(updated) });
};

export const deleteCategory = async (req, res) => {
  const { collegeId, actorId } = ctx(req);
  const { id } = req.params;
  if (!collegeId) throw httpError(403, 'FORBIDDEN', 'Tenant context missing');

  const cat = await prisma.storeCategory.findFirst({ where: { id, collegeId } });
  if (!cat) throw httpError(404, 'NOT_FOUND', 'Category not found');

  const assigned = await prisma.storeItem.count({ where: { collegeId, categoryId: id } });
  if (assigned > 0) {
    throw httpError(
      409, 'CATEGORY_HAS_ITEMS',
      `Cannot delete '${cat.name}' because ${assigned} item(s) use it. Reassign them or deactivate the category.`
    );
  }

  await prisma.storeCategory.delete({ where: { id } });
  logger.info(`[info] college=${collegeId} actor=${actorId} Deleted store category ${id}`);
  res.json({ success: true, data: { id, message: 'Category deleted successfully' } });
};