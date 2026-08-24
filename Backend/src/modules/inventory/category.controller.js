import { prisma, logger } from '../../server.js';
import { getOrSet, invalidateCachePattern } from '../../lib/cache.js';
import { createCategorySchema, updateCategorySchema } from './inventory.schema.js';

export const getCategories = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  if (!collegeId) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Tenant context missing' } });
  }

  const { page, limit, search, isActive, sortBy = 'name', sortOrder = 'asc' } = req.query;
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = limit !== undefined ? parseInt(limit, 10) : 100;
  const skip = (pageNum - 1) * (limitNum || 0);

  const where = {
    collegeId,
    ...(isActive !== undefined && isActive !== '' ? { isActive: isActive === 'true' || isActive === true } : {}),
    ...(search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    } : {})
  };

  const cacheKey = `inventory:categories:${collegeId}:${JSON.stringify({ pageNum, limitNum, search, isActive, sortBy, sortOrder })}`;

  const result = await getOrSet(cacheKey, 300, async () => {
    const [total, categories] = await Promise.all([
      prisma.productCategory.count({ where }),
      prisma.productCategory.findMany({
        where,
        include: {
          _count: {
            select: { items: true }
          }
        },
        orderBy: { [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc' },
        ...(limitNum > 0 ? { skip, take: limitNum } : {})
      })
    ]);

    const formatted = categories.map(cat => ({
      id: cat.id,
      collegeId: cat.collegeId,
      name: cat.name,
      code: cat.code,
      description: cat.description,
      isActive: cat.isActive,
      itemCount: cat._count?.items || 0,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
    }));

    return {
      items: formatted,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: limitNum > 0 ? Math.ceil(total / limitNum) : 1,
    };
  });

  res.json({ success: true, data: result.items, meta: { total: result.total, page: result.page, totalPages: result.totalPages } });
};

export const getCategoryById = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const { id } = req.params;

  if (!collegeId) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Tenant context missing' } });
  }

  const category = await prisma.productCategory.findFirst({
    where: { id, collegeId },
    include: {
      _count: {
        select: { items: true }
      }
    }
  });

  if (!category) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } });
  }

  res.json({
    success: true,
    data: {
      id: category.id,
      collegeId: category.collegeId,
      name: category.name,
      code: category.code,
      description: category.description,
      isActive: category.isActive,
      itemCount: category._count?.items || 0,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    }
  });
};

export const createCategory = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;

  if (!collegeId) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Tenant context missing' } });
  }

  const payload = createCategorySchema.parse(req.body);

  // Case-insensitive uniqueness checks within tenant
  const [existingName, existingCode] = await Promise.all([
    prisma.productCategory.findFirst({
      where: { collegeId, name: { equals: payload.name, mode: 'insensitive' } }
    }),
    prisma.productCategory.findFirst({
      where: { collegeId, code: { equals: payload.code, mode: 'insensitive' } }
    })
  ]);

  if (existingName) {
    return res.status(409).json({
      success: false,
      error: { code: 'DUPLICATE_CATEGORY_NAME', message: `Category with name '${payload.name}' already exists in your college.` }
    });
  }

  if (existingCode) {
    return res.status(409).json({
      success: false,
      error: { code: 'DUPLICATE_CATEGORY_CODE', message: `Category with code '${payload.code}' already exists in your college.` }
    });
  }

  const category = await prisma.productCategory.create({
    data: {
      ...payload,
      collegeId
    }
  });

  await invalidateCachePattern(`inventory:categories:${collegeId}:*`);
  logger.info(`[info] college=${collegeId} actor=${actorId} Created category id=${category.id} name='${category.name}' code='${category.code}'`);

  res.status(201).json({ success: true, data: category });
};

export const updateCategory = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { id } = req.params;

  if (!collegeId) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Tenant context missing' } });
  }

  const payload = updateCategorySchema.parse(req.body);

  const existing = await prisma.productCategory.findFirst({
    where: { id, collegeId }
  });

  if (!existing) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } });
  }

  // If changing name, verify case-insensitive uniqueness against other categories in this college
  if (payload.name && payload.name.toLowerCase() !== existing.name.toLowerCase()) {
    const duplicateName = await prisma.productCategory.findFirst({
      where: {
        collegeId,
        id: { not: id },
        name: { equals: payload.name, mode: 'insensitive' }
      }
    });

    if (duplicateName) {
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_CATEGORY_NAME', message: `Category with name '${payload.name}' already exists in your college.` }
      });
    }
  }

  // If changing code, verify case-insensitive uniqueness against other categories in this college
  if (payload.code && payload.code.toUpperCase() !== existing.code.toUpperCase()) {
    const duplicateCode = await prisma.productCategory.findFirst({
      where: {
        collegeId,
        id: { not: id },
        code: { equals: payload.code, mode: 'insensitive' }
      }
    });

    if (duplicateCode) {
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_CATEGORY_CODE', message: `Category with code '${payload.code}' already exists in your college.` }
      });
    }
  }

  const updated = await prisma.productCategory.update({
    where: { id },
    data: payload
  });

  await Promise.all([
    invalidateCachePattern(`inventory:categories:${collegeId}:*`),
    invalidateCachePattern(`inventory:items:${collegeId}:*`)
  ]);

  logger.info(`[info] college=${collegeId} actor=${actorId} Updated category id=${id}`);
  res.json({ success: true, data: updated });
};

export const deleteCategory = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { id } = req.params;

  if (!collegeId) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Tenant context missing' } });
  }

  const category = await prisma.productCategory.findFirst({
    where: { id, collegeId }
  });

  if (!category) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } });
  }

  // Check if any products are assigned to this category
  const assignedCount = await prisma.inventoryItem.count({
    where: { collegeId, categoryId: id }
  });

  if (assignedCount > 0) {
    logger.warn(`[warn] college=${collegeId} actor=${actorId} Attempted deletion of category id=${id} with ${assignedCount} assigned items`);
    return res.status(409).json({
      success: false,
      error: {
        code: 'CATEGORY_HAS_PRODUCTS',
        message: `Cannot delete category '${category.name}' because ${assignedCount} product(s) are assigned to it. Reassign products first or deactivate the category.`
      }
    });
  }

  await prisma.productCategory.delete({
    where: { id }
  });

  await invalidateCachePattern(`inventory:categories:${collegeId}:*`);
  logger.info(`[info] college=${collegeId} actor=${actorId} Deleted category id=${id} name='${category.name}'`);

  res.json({ success: true, data: { id, message: 'Category deleted successfully' } });
};
