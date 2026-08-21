import { prisma, logger } from '../../server.js';
import { createHostelBlockSchema } from './hostel.schema.js';

export const getItems = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const items = await prisma.hostelBlock.findMany({
    where: { collegeId },
    orderBy: { id: 'desc' }
  });

  const blocks = items.map(item => {
    let parsed = {};
    try {
      if (item.name.startsWith('{')) {
        parsed = JSON.parse(item.name);
      }
    } catch {
      // Plain name string
    }

    const totalRooms = Number(parsed.totalRooms || 100);
    const occupied = Number(parsed.occupied || 40);

    return {
      id: item.id,
      name: parsed.name || item.name,
      blockName: parsed.name || item.name,
      type: parsed.type || 'Boys',
      total: totalRooms,
      totalRooms,
      occupied,
      wardenName: parsed.wardenName || 'Chief Warden',
      wardenPhone: parsed.wardenPhone || '+91 98765 43210',
      status: parsed.status || (occupied >= totalRooms ? 'Full' : 'Active'),
    };
  });

  const totalBlocks = blocks.length;
  const totalCapacity = blocks.reduce((acc, b) => acc + (b.totalRooms || 0), 0);
  const occupiedBeds = blocks.reduce((acc, b) => acc + (b.occupied || 0), 0);
  const occupancyRate = totalCapacity > 0 ? `${Math.round((occupiedBeds / totalCapacity) * 100)}%` : '0%';

  res.json({
    success: true,
    data: blocks,
    stats: {
      totalBlocks,
      totalCapacity,
      occupiedBeds,
      occupancyRate
    }
  });
};

export const createItem = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const payload = createHostelBlockSchema.parse(req.body);

  const payloadString = JSON.stringify({
    name: payload.name,
    type: payload.type,
    totalRooms: payload.totalRooms,
    occupied: payload.occupied,
    wardenName: payload.wardenName,
    wardenPhone: payload.wardenPhone,
    status: payload.status,
    createdAt: new Date().toISOString(),
  });

  const item = await prisma.hostelBlock.create({
    data: {
      collegeId,
      name: payloadString
    }
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} blockId=${item.id} actor=${actorId} Created hostel block '${payload.name}'`);
  res.status(201).json({ success: true, data: item });
};

export const deleteItem = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { id } = req.params;

  const existing = await prisma.hostelBlock.findFirst({
    where: { id, collegeId }
  });

  if (!existing) {
    return res.status(404).json({ success: false, error: { code: 'BLOCK_NOT_FOUND', message: 'Hostel block not found' } });
  }

  await prisma.hostelBlock.delete({ where: { id } });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} blockId=${id} actor=${actorId} Deleted hostel block`);
  res.json({ success: true, message: 'Hostel block deleted successfully' });
};
