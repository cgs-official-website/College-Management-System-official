import { prisma, logger } from '../../server.js';
import {
  uploadPublicImage,
  deletePublicImage,
  STORE_IMAGE_ROOT,
} from '../../lib/cloudinary.js';
import { createStoreItemSchema, updateStoreItemSchema } from './store.schema.js';

const ctx = (req) => ({
  collegeId: req.tenant?.collegeId || req.user?.collegeId,
  actorId: req.user?.id || req.user?.userId,
});

const httpError = (statusCode, code, message) =>
  Object.assign(new Error(message), { statusCode, code });

const itemInclude = {
  storeCategory: { select: { id: true, name: true, code: true, isActive: true } },
};

const serializeItem = ({ storeCategory, ...i }) => ({
  ...i,
  price: Number(i.price),
  category: storeCategory?.name ?? i.category ?? null, 
  categoryActive: storeCategory ? storeCategory.isActive : true,
});

const resolveCategory = async (collegeId, categoryId, { requireActive } = {}) => {
  if (categoryId === undefined) return undefined;
  if (categoryId === null || categoryId === '') return null;
  const cat = await prisma.storeCategory.findFirst({ where: { id: categoryId, collegeId } });
  if (!cat) throw httpError(400, 'INVALID_CATEGORY', 'Category not found');
  if (requireActive && !cat.isActive) {
    throw httpError(400, 'INACTIVE_CATEGORY', `Category '${cat.name}' is inactive`);
  }
  return cat;
};

const assertOwnImage = (publicId, collegeId) => {
  if (publicId && !publicId.startsWith(`${STORE_IMAGE_ROOT}/${collegeId}/`)) {
    throw httpError(400, 'INVALID_IMAGE', 'Invalid image reference');
  }
};

const findDuplicate = (collegeId, name, categoryId, excludeId) =>
  prisma.storeItem.findFirst({
    where: {
      collegeId,
      name: { equals: name, mode: 'insensitive' },
      categoryId: categoryId ?? null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

const safeDeleteImage = async (publicId) => {
  if (!publicId) return;
  try { await deletePublicImage(publicId); }
  catch (e) { logger.warn(`[warn] Cloudinary delete failed for ${publicId}: ${e.message}`); }
};

export const getItems = async (req, res) => {
  const { collegeId } = ctx(req);
  if (!collegeId) throw httpError(403, 'FORBIDDEN', 'Tenant context missing');

  const { search, categoryId, status = 'active' } = req.query;

  const where = {
    collegeId,
    ...(status === 'active' ? { isActive: true } : status === 'inactive' ? { isActive: false } : {}),
    ...(categoryId ? { categoryId: String(categoryId) } : {}),
    ...(search ? {
      OR: [
        { name: { contains: String(search), mode: 'insensitive' } },
        { category: { contains: String(search), mode: 'insensitive' } },
      ],
    } : {}),
  };

  const items = await prisma.storeItem.findMany({
    where,
    include: itemInclude,
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, data: items.map(serializeItem), meta: { total: items.length } });
};

export const uploadImage = async (req, res) => {
  const { collegeId, actorId } = ctx(req);
  if (!collegeId) throw httpError(403, 'FORBIDDEN', 'Tenant context missing');
  if (!req.file) throw httpError(400, 'NO_FILE', 'Select an image to upload');

  const result = await uploadPublicImage(req.file.buffer, {
    folder: `${STORE_IMAGE_ROOT}/${collegeId}`,
  });

  logger.info(`[info] college=${collegeId} actor=${actorId} Uploaded store image ${result.public_id}`);
  res.status(201).json({
    success: true,
    data: { imageUrl: result.secure_url, imagePublicId: result.public_id },
  });
};

export const createItem = async (req, res) => {
  const { collegeId, actorId } = ctx(req);
  if (!collegeId) throw httpError(403, 'FORBIDDEN', 'Tenant context missing');

  const p = createStoreItemSchema.parse(req.body);
  assertOwnImage(p.imagePublicId, collegeId);

  const cat = await resolveCategory(collegeId, p.categoryId, { requireActive: true });

  if (await findDuplicate(collegeId, p.name, cat?.id)) {
    throw httpError(409, 'DUPLICATE_ITEM', `'${p.name}' already exists in this category`);
  }

  const openingStock = p.stock ?? 0;

  const item = await prisma.$transaction(async (tx) => {
    const created = await tx.storeItem.create({
      data: {
        collegeId,
        name: p.name,
        categoryId: cat?.id ?? null,
        category: cat?.name ?? null,
        price: p.price,
        stock: openingStock,
        lowStockAt: p.lowStockAt ?? 5,
        imageUrl: p.imageUrl ?? null,
        imagePublicId: p.imagePublicId ?? null,
        isActive: p.isActive ?? true,
      },
      include: itemInclude,
    });

    if (openingStock > 0) {
      await tx.storeStockMovement.create({
        data: {
          collegeId,
          itemId: created.id,
          type: 'OPENING',
          quantity: openingStock,
          balanceAfter: openingStock,
          note: 'Opening stock',
          byUserId: actorId || null,
        },
      });
    }
    return created;
  });

  logger.info(`[info] college=${collegeId} actor=${actorId} Created store item id=${item.id} name='${item.name}'`);
  res.status(201).json({ success: true, data: serializeItem(item) });
};

export const updateItem = async (req, res) => {
  const { collegeId, actorId } = ctx(req);
  const { id } = req.params;
  if (!collegeId) throw httpError(403, 'FORBIDDEN', 'Tenant context missing');

  const parsed = updateStoreItemSchema.parse(req.body);
  const data = Object.fromEntries(Object.entries(parsed).filter(([, v]) => v !== undefined));
  if (Object.keys(data).length === 0) {
    throw httpError(400, 'NO_CHANGES', 'Nothing to update');
  }

  const existing = await prisma.storeItem.findFirst({ where: { id, collegeId } });
  if (!existing) throw httpError(404, 'NOT_FOUND', 'Store item not found');

  assertOwnImage(data.imagePublicId, collegeId);

  if (data.categoryId !== undefined) {
    const cat = await resolveCategory(collegeId, data.categoryId, {
      requireActive: data.categoryId !== existing.categoryId,
    });
    data.categoryId = cat?.id ?? null;
    data.category = cat?.name ?? null;
  }

  if (data.name !== undefined || data.categoryId !== undefined) {
    const name = data.name ?? existing.name;
    const categoryId = data.categoryId !== undefined ? data.categoryId : existing.categoryId;
    if (await findDuplicate(collegeId, name, categoryId, id)) {
      throw httpError(409, 'DUPLICATE_ITEM', `'${name}' already exists in this category`);
    }
  }

  const updated = await prisma.storeItem.update({ where: { id }, data, include: itemInclude });

  // Image replaced or removed -> clean up the old file
  if (data.imagePublicId !== undefined && existing.imagePublicId && existing.imagePublicId !== data.imagePublicId) {
    await safeDeleteImage(existing.imagePublicId);
  }

  logger.info(`[info] college=${collegeId} actor=${actorId} Updated store item id=${id}`);
  res.json({ success: true, data: serializeItem(updated) });
};

export const deleteItem = async (req, res) => {
  const { collegeId, actorId } = ctx(req);
  const { id } = req.params;
  if (!collegeId) throw httpError(403, 'FORBIDDEN', 'Tenant context missing');

  const existing = await prisma.storeItem.findFirst({ where: { id, collegeId } });
  if (!existing) throw httpError(404, 'NOT_FOUND', 'Store item not found');

  const soldCount = await prisma.storeSaleItem.count({ where: { itemId: id } });

  if (soldCount > 0) {
    await prisma.storeItem.update({ where: { id }, data: { isActive: false } });
    logger.info(`[info] college=${collegeId} actor=${actorId} Deactivated sold store item id=${id}`);
    return res.json({
      success: true,
      data: {
        id,
        deactivated: true,
        message: `'${existing.name}' has sales history, so it was deactivated instead of deleted. Old bills are unaffected.`,
      },
    });
  }

  await prisma.storeItem.delete({ where: { id } }); // movements cascade
  await safeDeleteImage(existing.imagePublicId);

  logger.info(`[info] college=${collegeId} actor=${actorId} Deleted store item id=${id}`);
  res.json({
    success: true,
    data: { id, deactivated: false, message: `'${existing.name}' deleted successfully.` },
  });
};