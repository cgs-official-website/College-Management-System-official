import { prisma, logger } from '../../server.js';
import { getOrSet, invalidateCachePattern } from '../../lib/cache.js';
import { inventoryItemSchema, updateInventoryItemSchema } from './inventory.schema.js';

export const getItems = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  if (!collegeId) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Tenant context missing' } });
  }

  const { categoryId, search, page, limit, status, isArchived, includeArchived, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = limit !== undefined ? parseInt(limit, 10) : 0;
  const skip = (pageNum - 1) * (limitNum || 0);

  let archiveFilter = { isArchived: false };
  if (status === 'archived' || isArchived === 'true') {
    archiveFilter = { isArchived: true };
  } else if (status === 'all' || includeArchived === 'true') {
    archiveFilter = {};
  }

  const where = {
    collegeId,
    ...archiveFilter,
    ...(categoryId ? { categoryId } : {}),
    ...(search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { departmentLocation: { contains: search, mode: 'insensitive' } },
        { vendorName: { contains: search, mode: 'insensitive' } },
        { assetTagNo: { contains: search, mode: 'insensitive' } },
        { productCategory: { name: { contains: search, mode: 'insensitive' } } },
        { productCategory: { code: { contains: search, mode: 'insensitive' } } }
      ]
    } : {})
  };

  const cacheKey = `inventory:items:${collegeId}:${JSON.stringify({ categoryId, search, pageNum, limitNum, sortBy, sortOrder })}`;

  const result = await getOrSet(cacheKey, 120, async () => {
    const [total, items] = await Promise.all([
      prisma.inventoryItem.count({ where }),
      prisma.inventoryItem.findMany({
        where,
        include: {
          productCategory: {
            select: {
              id: true,
              name: true,
              code: true,
              isActive: true
            }
          }
        },
        orderBy: { [sortBy]: sortOrder === 'desc' ? 'desc' : 'asc' },
        ...(limitNum > 0 ? { skip, take: limitNum } : {})
      })
    ]);

    const formatted = items.map(item => ({
      id: item.id,
      collegeId: item.collegeId,
      name: item.name,
      sku: item.sku,
      category: item.productCategory?.name || item.category || null,
      categoryId: item.categoryId,
      productCategory: item.productCategory || null,
      quantity: item.quantity,
      departmentLocation: item.departmentLocation,
      unitOfMeasure: item.unitOfMeasure,
      reorderLevel: item.reorderLevel,
      vendorName: item.vendorName,
      purchaseDate: item.purchaseDate,
      warrantyExpiry: item.warrantyExpiry,
      assetTagNo: item.assetTagNo,
      remarks: item.remarks,
      isArchived: item.isArchived,
      isActive: item.isActive,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));

    return {
      items: formatted,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: limitNum > 0 ? Math.ceil(total / limitNum) : 1
    };
  });

  res.json({
    success: true,
    data: result.items,
    meta: { total: result.total, page: result.page, totalPages: result.totalPages }
  });
};

export const createItem = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;

  if (!collegeId) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Tenant context missing' } });
  }

  const payload = inventoryItemSchema.parse(req.body);

  // Validate categoryId belongs to this college if provided
  let categoryRecord = null;
  if (payload.categoryId) {
    categoryRecord = await prisma.productCategory.findFirst({
      where: { id: payload.categoryId, collegeId }
    });

    if (!categoryRecord) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_CATEGORY', message: 'Category not found or does not belong to your college.' }
      });
    }
  }

  const purchaseDate = payload.purchaseDate ? new Date(payload.purchaseDate) : null;
  const warrantyExpiry = payload.warrantyExpiry ? new Date(payload.warrantyExpiry) : null;

  // Execute atomic creation (Item + Opening Stock Audit Log if quantity > 0)
  const item = await prisma.$transaction(async (tx) => {
    const newItem = await tx.inventoryItem.create({
      data: {
        collegeId,
        name: payload.name,
        sku: payload.sku || null,
        category: categoryRecord ? categoryRecord.name : (payload.category || null),
        categoryId: payload.categoryId || null,
        quantity: payload.quantity || 0,
        departmentLocation: payload.departmentLocation || null,
        unitOfMeasure: payload.unitOfMeasure || null,
        reorderLevel: payload.reorderLevel ?? null,
        vendorName: payload.vendorName || null,
        purchaseDate: purchaseDate && !isNaN(purchaseDate) ? purchaseDate : null,
        warrantyExpiry: warrantyExpiry && !isNaN(warrantyExpiry) ? warrantyExpiry : null,
        assetTagNo: payload.assetTagNo || null,
        remarks: payload.remarks || null,
      },
      include: {
        productCategory: {
          select: { id: true, name: true, code: true, isActive: true }
        }
      }
    });

    // If initial stock is greater than 0, create an opening stock INBOUND audit log
    if (payload.quantity > 0) {
      await tx.inventoryAuditLog.create({
        data: {
          collegeId,
          inventoryItemId: newItem.id,
          categoryId: newItem.categoryId || null,
          movementType: 'INBOUND',
          quantity: payload.quantity,
          reason: 'Opening Stock',
          notes: 'Initial stock recorded on product creation',
          performedById: actorId || null
        }
      });
    }

    return newItem;
  }, { maxWait: 15000, timeout: 30000 });

  await Promise.all([
    invalidateCachePattern(`inventory:items:${collegeId}:*`),
    invalidateCachePattern(`inventory:categories:${collegeId}:*`)
  ]);

  logger.info(`[info] college=${collegeId} actor=${actorId} Created inventory item id=${item.id} name='${item.name}' qty=${item.quantity}`);

  res.status(201).json({ success: true, data: item });
};

export const updateItem = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { id } = req.params;

  if (!collegeId) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Tenant context missing' } });
  }

  const payload = updateInventoryItemSchema.parse(req.body);

  const existing = await prisma.inventoryItem.findFirst({
    where: { id, collegeId }
  });

  if (!existing) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Inventory item not found' } });
  }

  // Validate categoryId if provided and changing
  let categoryRecord = null;
  if (payload.categoryId !== undefined) {
    if (payload.categoryId) {
      categoryRecord = await prisma.productCategory.findFirst({
        where: { id: payload.categoryId, collegeId }
      });

      if (!categoryRecord) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_CATEGORY', message: 'Category not found or does not belong to your college.' }
        });
      }
    }
  }

  const purchaseDate = payload.purchaseDate !== undefined
    ? (payload.purchaseDate ? new Date(payload.purchaseDate) : null)
    : undefined;
  const warrantyExpiry = payload.warrantyExpiry !== undefined
    ? (payload.warrantyExpiry ? new Date(payload.warrantyExpiry) : null)
    : undefined;

  const item = await prisma.$transaction(async (tx) => {
    // If quantity is modified directly, track the delta in audit log
    if (payload.quantity !== undefined && payload.quantity !== existing.quantity) {
      const delta = payload.quantity - existing.quantity;
      if (delta > 0) {
        await tx.inventoryAuditLog.create({
          data: {
            collegeId,
            inventoryItemId: id,
            categoryId: payload.categoryId !== undefined ? payload.categoryId : existing.categoryId,
            movementType: 'INBOUND',
            quantity: delta,
            reason: 'Manual Stock Adjustment',
            notes: `Stock adjusted from ${existing.quantity} to ${payload.quantity}`,
            performedById: actorId || null
          }
        });
      } else if (delta < 0) {
        await tx.inventoryAuditLog.create({
          data: {
            collegeId,
            inventoryItemId: id,
            categoryId: payload.categoryId !== undefined ? payload.categoryId : existing.categoryId,
            movementType: 'OUTBOUND',
            quantity: Math.abs(delta),
            reason: 'Manual Stock Adjustment',
            notes: `Stock adjusted from ${existing.quantity} to ${payload.quantity}`,
            performedById: actorId || null
          }
        });
      }
    }

    const updated = await tx.inventoryItem.update({
      where: { id },
      data: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.sku !== undefined ? { sku: payload.sku } : {}),
        ...(payload.categoryId !== undefined ? {
          categoryId: payload.categoryId,
          category: categoryRecord ? categoryRecord.name : (payload.category || null)
        } : (payload.category !== undefined ? { category: payload.category } : {})),
        ...(payload.quantity !== undefined ? { quantity: payload.quantity } : {}),
        ...(payload.departmentLocation !== undefined ? { departmentLocation: payload.departmentLocation } : {}),
        ...(payload.unitOfMeasure !== undefined ? { unitOfMeasure: payload.unitOfMeasure } : {}),
        ...(payload.reorderLevel !== undefined ? { reorderLevel: payload.reorderLevel } : {}),
        ...(payload.vendorName !== undefined ? { vendorName: payload.vendorName } : {}),
        ...(purchaseDate !== undefined ? { purchaseDate } : {}),
        ...(warrantyExpiry !== undefined ? { warrantyExpiry } : {}),
        ...(payload.assetTagNo !== undefined ? { assetTagNo: payload.assetTagNo } : {}),
        ...(payload.remarks !== undefined ? { remarks: payload.remarks } : {}),
        ...(payload.isArchived !== undefined ? { isArchived: payload.isArchived } : {}),
        ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {})
      },
      include: {
        productCategory: {
          select: { id: true, name: true, code: true, isActive: true }
        }
      }
    });

    return updated;
  }, { maxWait: 15000, timeout: 30000 });

  await Promise.all([
    invalidateCachePattern(`inventory:items:${collegeId}:*`),
    invalidateCachePattern(`inventory:categories:${collegeId}:*`)
  ]);

  logger.info(`[info] college=${collegeId} actor=${actorId} Updated inventory item id=${id}`);
  res.json({ success: true, data: item });
};

export const deleteItem = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { id } = req.params;

  if (!collegeId) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Tenant context missing' } });
  }

  const existing = await prisma.inventoryItem.findFirst({
    where: { id, collegeId }
  });

  if (!existing) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Inventory item not found' } });
  }

  // Check if historical audit logs exist for this item
  const auditCount = await prisma.inventoryAuditLog.count({
    where: { collegeId, inventoryItemId: id }
  });

  if (auditCount > 0) {
    // Perform soft delete / archiving to preserve audit trail integrity
    await prisma.$transaction(async (tx) => {
      // If there is active stock remaining, record an outbound write-off
      if (existing.quantity > 0) {
        await tx.inventoryAuditLog.create({
          data: {
            collegeId,
            inventoryItemId: id,
            categoryId: existing.categoryId || null,
            movementType: 'OUTBOUND',
            quantity: existing.quantity,
            reason: 'Product Deletion / Archival',
            notes: `Item '${existing.name}' archived and remaining stock of ${existing.quantity} written off`,
            performedById: actorId || null
          }
        });
      }

      await tx.inventoryItem.update({
        where: { id },
        data: {
          isArchived: true,
          isActive: false,
          quantity: 0
        }
      });
    }, { maxWait: 15000, timeout: 30000 });

    await Promise.all([
      invalidateCachePattern(`inventory:items:${collegeId}:*`),
      invalidateCachePattern(`inventory:categories:${collegeId}:*`)
    ]);

    logger.info(`[info] college=${collegeId} actor=${actorId} Soft-deleted/archived item id=${id} name='${existing.name}' (has ${auditCount} audit logs)`);
    return res.json({
      success: true,
      data: {
        id,
        isArchived: true,
        message: `Item '${existing.name}' has historical movement records and was safely archived from active inventory.`
      }
    });
  }

  // If no audit logs exist, hard delete cleanly
  await prisma.inventoryItem.delete({
    where: { id }
  });

  await Promise.all([
    invalidateCachePattern(`inventory:items:${collegeId}:*`),
    invalidateCachePattern(`inventory:categories:${collegeId}:*`)
  ]);

  logger.info(`[info] college=${collegeId} actor=${actorId} Hard-deleted item id=${id} name='${existing.name}' (no audit logs)`);
  return res.json({
    success: true,
    data: {
      id,
      isArchived: false,
      message: `Item '${existing.name}' deleted successfully.`
    }
  });
};

export const bulkImportInventory = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { data } = req.body;

  if (!collegeId) {
    return res.status(400).json({ success: false, error: { code: 'FORBIDDEN', message: 'College ID is required' } });
  }

  if (!Array.isArray(data) || data.length === 0) {
    return res.status(400).json({ success: false, error: { code: 'EMPTY_DATA', message: 'No data provided for import' } });
  }

  // Pre-fetch all categories for this college to optimize lookup
  const categories = await prisma.productCategory.findMany({
    where: { collegeId }
  });

  const categoryMap = new Map();
  for (const cat of categories) {
    categoryMap.set(cat.name.toLowerCase(), cat);
    categoryMap.set(cat.code.toUpperCase(), cat);
  }

  const results = { successful: 0, failed: 0, errors: [] };

  for (const [index, row] of data.entries()) {
    try {
      const itemName = String(row['Item_Name*'] || row['Item_Name'] || row['name'] || '').trim();

      if (!itemName) {
        throw new Error('Item_Name is required');
      }

      const rawCategory = String(row['Category'] || row['category'] || row['Category_Code'] || '').trim();
      const matchedCategory = rawCategory ? categoryMap.get(rawCategory.toLowerCase()) || categoryMap.get(rawCategory.toUpperCase()) : null;

      const openingStock = parseInt(row['Opening_Stock'] || row['quantity'] || '0', 10) || 0;

      const purchaseDate = row['Purchase_Date'] || row['purchaseDate'] ? new Date(row['Purchase_Date'] || row['purchaseDate']) : null;
      const warrantyExpiry = row['Warranty_Expiry'] || row['warrantyExpiry'] ? new Date(row['Warranty_Expiry'] || row['warrantyExpiry']) : null;

      await prisma.$transaction(async (tx) => {
        const newItem = await tx.inventoryItem.create({
          data: {
            collegeId,
            name: itemName,
            sku: row['Item_Code'] || row['sku'] ? String(row['Item_Code'] || row['sku']) : null,
            category: matchedCategory ? matchedCategory.name : (rawCategory || null),
            categoryId: matchedCategory ? matchedCategory.id : null,
            quantity: openingStock,
            departmentLocation: row['Department_Location'] || row['departmentLocation'] ? String(row['Department_Location'] || row['departmentLocation']) : null,
            unitOfMeasure: row['Unit_of_Measure'] || row['unitOfMeasure'] ? String(row['Unit_of_Measure'] || row['unitOfMeasure']) : null,
            reorderLevel: row['Reorder_Level'] || row['reorderLevel'] ? parseInt(row['Reorder_Level'] || row['reorderLevel'], 10) : null,
            vendorName: row['Vendor_Name'] || row['vendorName'] ? String(row['Vendor_Name'] || row['vendorName']) : null,
            purchaseDate: purchaseDate && !isNaN(purchaseDate) ? purchaseDate : null,
            warrantyExpiry: warrantyExpiry && !isNaN(warrantyExpiry) ? warrantyExpiry : null,
            assetTagNo: row['Asset_Tag_No'] || row['assetTagNo'] ? String(row['Asset_Tag_No'] || row['assetTagNo']) : null,
            remarks: row['Remarks'] || row['remarks'] ? String(row['Remarks'] || row['remarks']) : null,
          }
        });

        if (openingStock > 0) {
          await tx.inventoryAuditLog.create({
            data: {
              collegeId,
              inventoryItemId: newItem.id,
              categoryId: newItem.categoryId || null,
              movementType: 'INBOUND',
              quantity: openingStock,
              reason: 'Bulk Import',
              notes: 'Initial stock from bulk import',
              performedById: actorId || null
            }
          });
        }
      });

      results.successful++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Row ${index + 2}: ${error.message}`);
    }
  }

  await Promise.all([
    invalidateCachePattern(`inventory:items:${collegeId}:*`),
    invalidateCachePattern(`inventory:categories:${collegeId}:*`)
  ]);

  logger.info(`[info] college=${collegeId} actor=${actorId} Bulk imported inventory items: ${results.successful} success, ${results.failed} failed`);
  res.json({ success: true, data: results });
};
