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
  const { title } = req.body;

  if (!title) {
    return res.status(400).json({ success: false, error: { code: 'TITLE_REQUIRED', message: 'Title is required' } });
  }

  const item = await prisma.libraryItem.create({
    data: { collegeId, title }
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} itemId=${item.id} actor=${actorId} Created library item`);
  res.status(201).json({ success: true, data: item });
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
