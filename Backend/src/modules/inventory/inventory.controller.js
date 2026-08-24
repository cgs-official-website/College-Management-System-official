import { prisma, logger } from '../../server.js';
import { inventoryItemSchema } from './inventory.schema.js';

export const getItems = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  if (!collegeId) {
    return res.status(403).json({ success: false, error: { message: 'Tenant context missing' } });
  }

  const items = await prisma.inventoryItem.findMany({
    where: { collegeId },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ success: true, data: items });
};

export const createItem = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  if (!collegeId) {
    return res.status(403).json({ success: false, error: { message: 'Tenant context missing' } });
  }

  const payload = inventoryItemSchema.parse(req.body);

  const item = await prisma.inventoryItem.create({
    data: {
      ...payload,
      collegeId
    }
  });

  res.status(201).json({ success: true, data: item });
};

export const updateItem = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const { id } = req.params;

  if (!collegeId) {
    return res.status(403).json({ success: false, error: { message: 'Tenant context missing' } });
  }

  const payload = inventoryItemSchema.parse(req.body);

  const item = await prisma.inventoryItem.update({
    where: { id },
    data: payload
  });

  res.json({ success: true, data: item });
};

export const deleteItem = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const { id } = req.params;

  if (!collegeId) {
    return res.status(403).json({ success: false, error: { message: 'Tenant context missing' } });
  }

  await prisma.inventoryItem.delete({
    where: { id }
  });

  res.json({ success: true, data: { id } });
};

export const bulkImportInventory = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { data } = req.body;

  if (!collegeId) {
    return res.status(400).json({ success: false, error: { message: 'College ID is required' } });
  }
  
  if (!Array.isArray(data) || data.length === 0) {
    return res.status(400).json({ success: false, error: { message: 'No data provided for import' } });
  }

  const results = { successful: 0, failed: 0, errors: [] };
  
  for (const [index, row] of data.entries()) {
    try {
      const itemName = String(row['Item_Name*'] || row['Item_Name'] || '').trim();

      if (!itemName) {
        throw new Error('Item_Name is required');
      }

      const purchaseDate = row['Purchase_Date'] ? new Date(row['Purchase_Date']) : null;
      const warrantyExpiry = row['Warranty_Expiry'] ? new Date(row['Warranty_Expiry']) : null;

      await prisma.inventoryItem.create({
        data: {
          collegeId,
          name: itemName,
          sku: row['Item_Code'] ? String(row['Item_Code']) : null,
          category: row['Category'] ? String(row['Category']) : null,
          quantity: row['Opening_Stock'] ? parseInt(row['Opening_Stock'], 10) : 0,
          unitPrice: row['Unit_Price'] ? parseFloat(row['Unit_Price']) : 0,
          
          departmentLocation: row['Department_Location'] ? String(row['Department_Location']) : null,
          unitOfMeasure: row['Unit_of_Measure'] ? String(row['Unit_of_Measure']) : null,
          reorderLevel: row['Reorder_Level'] ? parseInt(row['Reorder_Level'], 10) : null,
          vendorName: row['Vendor_Name'] ? String(row['Vendor_Name']) : null,
          purchaseDate: purchaseDate && !isNaN(purchaseDate) ? purchaseDate : null,
          warrantyExpiry: warrantyExpiry && !isNaN(warrantyExpiry) ? warrantyExpiry : null,
          assetTagNo: row['Asset_Tag_No'] ? String(row['Asset_Tag_No']) : null,
          remarks: row['Remarks'] ? String(row['Remarks']) : null,
        }
      });

      results.successful++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Row ${index + 2}: ${error.message}`);
    }
  }

  logger.info(`[info] req=${req.id || ''} college=${collegeId} actor=${actorId} Bulk imported inventory items: ${results.successful} success, ${results.failed} failed`);
  res.json({ success: true, data: results });
};
