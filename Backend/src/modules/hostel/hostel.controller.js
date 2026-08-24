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

export const getHostelStudents = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const students = await prisma.student.findMany({
    where: { 
      collegeId, 
      residenceType: 'Hosteller', 
      deletedAt: null 
    },
    include: {
      user: { select: { email: true, name: true } },
      department: true,
      hostelBlock: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const formatted = students.map(s => {
    const emailPrefix = s.user?.email ? s.user.email.split('@')[0] : 'Student';
    const parts = emailPrefix.split('.');
    const fName = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'Student';
    const lName = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : '';

    let blockName = s.hostelBlock?.name || null;
    if (blockName && blockName.startsWith('{')) {
      try { blockName = JSON.parse(blockName).name; } catch {}
    }

    return {
      id: s.id,
      name: `${fName} ${lName}`.trim(),
      admissionNo: s.admissionNumber || s.rollNumber,
      department: s.department?.name || '',
      hostelBlockId: s.hostelBlockId,
      hostelBlockName: blockName,
      hostelRoom: s.hostelRoom,
    };
  });

  res.json({ success: true, data: formatted });
};

export const assignHostelRoom = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { id } = req.params;
  const { hostelBlockId, hostelRoom } = req.body;

  const student = await prisma.student.findFirst({
    where: { id, collegeId }
  });

  if (!student) {
    return res.status(404).json({ success: false, error: { code: 'STUDENT_NOT_FOUND', message: 'Student not found' } });
  }

  const updated = await prisma.student.update({
    where: { id },
    data: {
      hostelBlockId: hostelBlockId || null,
      hostelRoom: hostelRoom || null
    }
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} studentId=${id} actor=${actorId} Assigned hostel room`);
  res.json({ success: true, data: updated });
};

export const bulkImportHostelRooms = async (req, res) => {
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
  const blocksCache = {};
  
  for (const [index, row] of data.entries()) {
    try {
      const blockName = String(row['Hostel_Block*'] || row['Hostel_Block'] || '').trim();
      const roomNo = String(row['Room_No*'] || row['Room_No'] || '').trim();

      if (!blockName || !roomNo) {
        throw new Error('Hostel_Block and Room_No are required');
      }

      // Block lookup or creation
      let blockId = blocksCache[blockName];
      if (!blockId) {
        let block = await prisma.hostelBlock.findFirst({
          where: { collegeId, name: { equals: blockName, mode: 'insensitive' } }
        });
        
        // Sometimes name is stringified JSON due to previous implementation
        if (!block) {
          const allBlocks = await prisma.hostelBlock.findMany({ where: { collegeId } });
          const match = allBlocks.find(b => {
             try {
               const p = JSON.parse(b.name);
               return p.name.toLowerCase() === blockName.toLowerCase();
             } catch {
               return b.name.toLowerCase() === blockName.toLowerCase();
             }
          });
          if (match) block = match;
        }

        if (!block) {
          const payloadString = JSON.stringify({
            name: blockName,
            type: 'Mixed',
            totalRooms: 100,
            occupied: 0,
            wardenName: row['Warden_Name'] || 'Warden',
            wardenPhone: row['Warden_Contact'] || '',
            status: 'Active',
            createdAt: new Date().toISOString(),
          });
          
          block = await prisma.hostelBlock.create({
            data: {
              collegeId,
              name: payloadString
            }
          });
        }
        blocksCache[blockName] = block.id;
        blockId = block.id;
      }

      await prisma.hostelRoom.upsert({
        where: {
          hostelBlockId_roomNo: {
            hostelBlockId: blockId,
            roomNo
          }
        },
        update: {
          roomType: row['Room_Type'] ? String(row['Room_Type']) : undefined,
          capacity: row['Capacity'] ? parseInt(row['Capacity'], 10) : undefined,
          floor: row['Floor'] ? String(row['Floor']) : undefined,
          wardenName: row['Warden_Name'] ? String(row['Warden_Name']) : undefined,
          wardenContact: row['Warden_Contact'] ? String(row['Warden_Contact']) : undefined,
        },
        create: {
          collegeId,
          hostelBlockId: blockId,
          roomNo,
          roomType: row['Room_Type'] ? String(row['Room_Type']) : null,
          capacity: row['Capacity'] ? parseInt(row['Capacity'], 10) : null,
          floor: row['Floor'] ? String(row['Floor']) : null,
          wardenName: row['Warden_Name'] ? String(row['Warden_Name']) : null,
          wardenContact: row['Warden_Contact'] ? String(row['Warden_Contact']) : null,
        }
      });

      results.successful++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Row ${index + 2}: ${error.message}`);
    }
  }

  logger.info(`[info] req=${req.id || ''} college=${collegeId} actor=${actorId} Bulk imported hostel rooms: ${results.successful} success, ${results.failed} failed`);
  res.json({ success: true, data: results });
};
