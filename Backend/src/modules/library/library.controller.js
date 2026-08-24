import { prisma, logger } from '../../server.js';

export const getLibraryItems = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const items = await prisma.libraryItem.findMany({
    where: { collegeId }
  });
  res.json({ success: true, data: items });
};

export const createLibraryItem = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { title, author, isbn, category, totalCopies, availableCopies, location } = req.body;

  if (!title) {
    return res.status(400).json({ success: false, error: { code: 'TITLE_REQUIRED', message: 'Title is required' } });
  }

  const item = await prisma.libraryItem.create({
    data: { 
      collegeId, 
      title,
      author,
      isbn,
      category,
      totalCopies: totalCopies ? Number(totalCopies) : 1,
      availableCopies: availableCopies ? Number(availableCopies) : 1,
      location
    }
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} itemId=${item.id} actor=${actorId} Created library item`);
  res.status(201).json({ success: true, data: item });
};

export const updateLibraryItem = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { id } = req.params;
  const { title, author, isbn, category, totalCopies, availableCopies, location } = req.body;

  const existing = await prisma.libraryItem.findFirst({
    where: { id, collegeId }
  });

  if (!existing) {
    return res.status(404).json({ success: false, error: { code: 'ITEM_NOT_FOUND', message: 'Library item not found' } });
  }

  const item = await prisma.libraryItem.update({
    where: { id },
    data: { 
      title,
      author,
      isbn,
      category,
      totalCopies: totalCopies ? Number(totalCopies) : undefined,
      availableCopies: availableCopies ? Number(availableCopies) : undefined,
      location
    }
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} itemId=${item.id} actor=${actorId} Updated library item`);
  res.json({ success: true, data: item });
};

export const deleteLibraryItem = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { id } = req.params;

  const existing = await prisma.libraryItem.findFirst({
    where: { id, collegeId }
  });

  if (!existing) {
    return res.status(404).json({ success: false, error: { code: 'ITEM_NOT_FOUND', message: 'Library item not found' } });
  }

  await prisma.libraryItem.delete({ where: { id } });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} itemId=${id} actor=${actorId} Deleted library item`);
  res.json({ success: true, message: 'Library item deleted' });
};

export const bulkImportLibrary = async (req, res) => {
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
      const bookTitle = String(row['Book_Title*'] || row['Book_Title'] || '').trim();
      const noOfCopies = parseInt(row['No_of_Copies*'] || row['No_of_Copies'], 10);

      if (!bookTitle) {
        throw new Error('Book_Title is required');
      }

      const totalCopies = isNaN(noOfCopies) ? 1 : noOfCopies;
      const purchaseDate = row['Purchase_Date'] ? new Date(row['Purchase_Date']) : null;

      await prisma.libraryItem.create({
        data: {
          collegeId,
          title: bookTitle,
          author: row['Author'] ? String(row['Author']) : null,
          isbn: row['ISBN'] ? String(row['ISBN']) : null,
          category: row['Category'] ? String(row['Category']) : null,
          totalCopies: totalCopies,
          availableCopies: totalCopies, // assume all new copies are available
          location: row['Rack_No'] ? String(row['Rack_No']) : null,
          
          // New mapped fields
          edition: row['Edition'] ? String(row['Edition']) : null,
          department: row['Department'] ? String(row['Department']) : null,
          price: row['Price'] ? parseFloat(row['Price']) : null,
          rackNo: row['Rack_No'] ? String(row['Rack_No']) : null,
          purchaseDate: purchaseDate && !isNaN(purchaseDate) ? purchaseDate : null,
          vendorName: row['Vendor_Name'] ? String(row['Vendor_Name']) : null,
        }
      });

      results.successful++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Row ${index + 2}: ${error.message}`);
    }
  }

  logger.info(`[info] req=${req.id || ''} college=${collegeId} actor=${actorId} Bulk imported library items: ${results.successful} success, ${results.failed} failed`);
  res.json({ success: true, data: results });
};
