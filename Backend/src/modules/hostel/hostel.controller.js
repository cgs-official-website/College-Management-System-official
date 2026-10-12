import { prisma, logger } from '../../server.js';
import {
  createHostelBlockSchema, updateHostelBlockSchema, roomSchema, updateRoomSchema, ROOM_TYPES,
} from './hostel.schema.js';

const fail = (res, status, code, message) =>
  res.status(status).json({ success: false, error: { code, message } });

class HostelError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

const ctx = (req) => ({
  collegeId: req.tenant?.collegeId || req.user?.collegeId,
  actorId: req.user?.id || req.user?.userId,
});

const roomStatus = (occ, cap) => (occ >= cap ? 'Full' : occ > 0 ? 'Partial' : 'Available');
const studentCount = { _count: { select: { students: { where: { deletedAt: null } } } } };

export const getItems = async (req, res) => {
  const { collegeId } = ctx(req);

  const [blocks, roomAgg, occAgg] = await Promise.all([
    prisma.hostelBlock.findMany({ where: { collegeId }, orderBy: { name: 'asc' } }),
    prisma.hostelRoom.groupBy({
      by: ['hostelBlockId'], where: { collegeId },
      _count: { _all: true }, _sum: { capacity: true },
    }),
    prisma.student.groupBy({
      by: ['hostelBlockId'],
      where: { collegeId, deletedAt: null, hostelBlockId: { not: null }, hostelRoomId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const rooms = Object.fromEntries(roomAgg.map((r) => [r.hostelBlockId, { count: r._count._all, beds: r._sum.capacity || 0 }]));
  const occ = Object.fromEntries(occAgg.map((o) => [o.hostelBlockId, o._count._all]));

  const data = blocks.map((b) => {
    const totalRooms = rooms[b.id]?.count || 0;
    const totalBeds = rooms[b.id]?.beds || 0;
    const occupied = occ[b.id] || 0;
    return {
      id: b.id, name: b.name, type: b.type,
      wardenName: b.wardenName, wardenPhone: b.wardenPhone,
      totalRooms, totalBeds, occupied,
      status: b.status === 'Renovation' ? 'Renovation'
        : (totalBeds > 0 && occupied >= totalBeds ? 'Full' : 'Active'),
    };
  });

  const totalBeds = data.reduce((a, b) => a + b.totalBeds, 0);
  const occupiedBeds = data.reduce((a, b) => a + b.occupied, 0);

  res.json({
    success: true,
    data,
    stats: {
      totalBlocks: data.length,
      totalRooms: data.reduce((a, b) => a + b.totalRooms, 0),
      totalCapacity: totalBeds,
      occupiedBeds,
      occupancyRate: totalBeds > 0 ? `${Math.round((occupiedBeds / totalBeds) * 100)}%` : '0%',
    },
  });
};

export const createItem = async (req, res) => {
  const { collegeId, actorId } = ctx(req);
  const payload = createHostelBlockSchema.parse(req.body);

  const dup = await prisma.hostelBlock.findFirst({
    where: { collegeId, name: { equals: payload.name, mode: 'insensitive' } },
  });
  if (dup) return fail(res, 409, 'BLOCK_EXISTS', `Block "${payload.name}" already exists`);

  const block = await prisma.$transaction(async (tx) => {
    const b = await tx.hostelBlock.create({
      data: {
        collegeId,
        name: payload.name,
        type: payload.type,
        status: payload.status,
        wardenName: payload.wardenName || null,
        wardenPhone: payload.wardenPhone || null,
      },
    });
    await tx.hostelRoom.createMany({
      data: payload.rooms.map((r) => ({
        collegeId, hostelBlockId: b.id, roomNo: r.roomNo,
        roomType: r.roomType, capacity: r.capacity, floor: r.floor || null,
      })),
    });
    return b;
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} blockId=${block.id} actor=${actorId} Created hostel block '${block.name}' with ${payload.rooms.length} rooms`);
  res.status(201).json({ success: true, data: block });
};

export const updateItem = async (req, res) => {
  const { collegeId } = ctx(req);
  const { id } = req.params;
  const data = updateHostelBlockSchema.parse(req.body);

  const existing = await prisma.hostelBlock.findFirst({ where: { id, collegeId } });
  if (!existing) return fail(res, 404, 'BLOCK_NOT_FOUND', 'Hostel block not found');

  if (data.name && data.name.toLowerCase() !== existing.name.toLowerCase()) {
    const dup = await prisma.hostelBlock.findFirst({
      where: { collegeId, name: { equals: data.name, mode: 'insensitive' }, NOT: { id } },
    });
    if (dup) return fail(res, 409, 'BLOCK_EXISTS', `Block "${data.name}" already exists`);
  }

  const patch = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.type !== undefined) patch.type = data.type;
  if (data.status !== undefined) patch.status = data.status;
  if (data.wardenName !== undefined) patch.wardenName = data.wardenName || null;
  if (data.wardenPhone !== undefined) patch.wardenPhone = data.wardenPhone || null;

  const updated = await prisma.hostelBlock.update({ where: { id }, data: patch });
  res.json({ success: true, data: updated });
};

export const deleteItem = async (req, res) => {
  const { collegeId, actorId } = ctx(req);
  const { id } = req.params;

  const existing = await prisma.hostelBlock.findFirst({ where: { id, collegeId } });
  if (!existing) return fail(res, 404, 'BLOCK_NOT_FOUND', 'Hostel block not found');

  const active = await prisma.student.count({ where: { hostelBlockId: id, collegeId, deletedAt: null } });
  if (active > 0) {
    return fail(res, 409, 'BLOCK_HAS_STUDENTS',
      `${active} student(s) are assigned to this block. Reassign or unassign them first.`);
  }

  await prisma.$transaction([
    prisma.student.updateMany({
      where: { hostelBlockId: id, collegeId },
      data: { hostelBlockId: null, hostelRoomId: null, hostelRoom: null },
    }),
    prisma.hostelRoom.deleteMany({ where: { hostelBlockId: id, collegeId } }),
    prisma.hostelBlock.delete({ where: { id } }),
  ]);

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
      hostelBlock: true,
      room: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  const formatted = students.map((s) => ({
    id: s.id,
    name: s.user?.name || (s.user?.email ? s.user.email.split('@')[0] : 'Student'),
    admissionNo: s.admissionNumber || s.rollNumber,
    department: s.department?.name || '',
    hostelBlockId: s.hostelBlockId,
    hostelBlockName: s.hostelBlock?.name || null,
    hostelRoomId: s.hostelRoomId,
    hostelRoom: s.room?.roomNo || s.hostelRoom,
  }));

  res.json({ success: true, data: formatted });
};

export const getAvailableRooms = async (req, res) => {
  const { collegeId } = ctx(req);
  const { blockId, includeRoomId } = req.query;
  if (!blockId) return fail(res, 400, 'BLOCK_REQUIRED', 'blockId is required');

  const block = await prisma.hostelBlock.findFirst({ where: { id: blockId, collegeId } });
  if (!block || block.status === 'Renovation') return res.json({ success: true, data: [] });

  const rooms = await prisma.hostelRoom.findMany({
    where: { hostelBlockId: blockId, collegeId },
    include: studentCount,
    orderBy: [{ floor: 'asc' }, { roomNo: 'asc' }],
  });

  const data = rooms
    .map((r) => ({ id: r.id, roomNo: r.roomNo, roomType: r.roomType, floor: r.floor, capacity: r.capacity ?? 0, occupied: r._count.students }))
    .filter((r) => r.occupied < r.capacity || r.id === includeRoomId);

  res.json({ success: true, data });
};

export const assignHostelRoom = async (req, res) => {
  const { collegeId, actorId } = ctx(req);
  const { id } = req.params;
  const { hostelRoomId } = req.body;

  const student = await prisma.student.findFirst({ where: { id, collegeId, deletedAt: null } });
  if (!student) return fail(res, 404, 'STUDENT_NOT_FOUND', 'Student not found');

  if (!hostelRoomId) {
    await prisma.student.update({ where: { id }, data: { hostelRoomId: null, hostelBlockId: null, hostelRoom: null } });
    return res.json({ success: true, message: 'Room unassigned' });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw`
        SELECT id FROM "HostelRoom"
        WHERE id = ${hostelRoomId}::uuid AND "collegeId" = ${collegeId}::uuid
        FOR UPDATE`;
      if (locked.length === 0) throw new HostelError(404, 'ROOM_NOT_FOUND', 'Room not found');

      const room = await tx.hostelRoom.findUnique({ where: { id: hostelRoomId }, include: { hostelBlock: true } });
      if (room.hostelBlock.status === 'Renovation') {
        throw new HostelError(409, 'BLOCK_UNAVAILABLE', 'This block is under renovation');
      }

      const occupied = await tx.student.count({ where: { hostelRoomId, deletedAt: null, NOT: { id } } });
      if (occupied >= (room.capacity ?? 0)) {
        throw new HostelError(409, 'ROOM_FULL', `Room ${room.roomNo} is full (${occupied}/${room.capacity})`);
      }

      return tx.student.update({
        where: { id },
        data: { hostelRoomId, hostelBlockId: room.hostelBlockId, hostelRoom: room.roomNo },
      });
    });

    logger.info(`[info] req=${req.id || ''} college=${collegeId} studentId=${id} actor=${actorId} Assigned room ${hostelRoomId}`);
    res.json({ success: true, data: updated });
  } catch (e) {
    if (e instanceof HostelError) return fail(res, e.status, e.code, e.message);
    throw e;
  }
};

const str = (v) => (v === undefined || v === null ? '' : String(v).trim());
const guessType = (name) => {
  if (/girl|women|ladies|female/i.test(name)) return 'Girls';
  if (/\bboys?\b|\bmen\b|gents|\bmale\b/i.test(name)) return 'Boys';
  if (/staff|faculty/i.test(name)) return 'Staff';
  return 'Co-Ed';
};

export const bulkImportHostelRooms = async (req, res) => {
  const { collegeId, actorId } = ctx(req);
  const { data } = req.body;

  if (!collegeId) return fail(res, 400, 'COLLEGE_REQUIRED', 'College ID is required');
  if (!Array.isArray(data) || data.length === 0) return fail(res, 400, 'NO_DATA', 'No data provided for import');

  const results = { successful: 0, failed: 0, blocksCreated: 0, roomsCreated: 0, roomsUpdated: 0, errors: [], warnings: [] };

  const blocks = await prisma.hostelBlock.findMany({ where: { collegeId } });
  const blockByName = new Map(blocks.map((b) => [b.name.toLowerCase(), b]));
  const wardenSeen = new Map();
  const warned = new Set();
  const seenRooms = new Set();

  for (const [index, row] of data.entries()) {
    const rowNo = index + 2;
    try {
      const blockName = str(row['Hostel_Block*'] ?? row['Hostel_Block']);
      const roomNo = str(row['Room_No*'] ?? row['Room_No']);
      const rawType = str(row['Room_Type*'] ?? row['Room_Type']);
      const roomType = rawType.charAt(0).toUpperCase() + rawType.slice(1).toLowerCase();
      const capacity = Number(row['Capacity*'] ?? row['Capacity']);
      const floor = str(row['Floor']);
      const wardenName = str(row['Warden_Name']);
      const wardenPhone = str(row['Warden_Contact']);

      if (!blockName) throw new Error('Hostel_Block is required');
      if (!roomNo) throw new Error('Room_No is required');
      if (!ROOM_TYPES.includes(roomType)) throw new Error(`Room_Type must be one of ${ROOM_TYPES.join(', ')}`);
      if (!Number.isInteger(capacity) || capacity < 1) throw new Error('Capacity must be a whole number of at least 1');
      if (wardenPhone && !/^\d{10}$/.test(wardenPhone)) throw new Error('Warden_Contact must be 10 digits');

      const key = blockName.toLowerCase();
      const roomKey = `${key}|${roomNo.toLowerCase()}`;
      if (seenRooms.has(roomKey)) throw new Error(`Room ${roomNo} appears twice in ${blockName}`);
      seenRooms.add(roomKey);

      let block = blockByName.get(key);
      if (!block) {
        block = await prisma.hostelBlock.create({
          data: { collegeId, name: blockName, type: guessType(blockName), wardenName: wardenName || null, wardenPhone: wardenPhone || null },
        });
        blockByName.set(key, block);
        wardenSeen.set(key, { wardenName, wardenPhone });
        results.blocksCreated++;
      } else if (!wardenSeen.has(key)) {
        wardenSeen.set(key, { wardenName, wardenPhone });
        if (!block.wardenName && !block.wardenPhone && (wardenName || wardenPhone)) {
          block = await prisma.hostelBlock.update({
            where: { id: block.id },
            data: { wardenName: wardenName || null, wardenPhone: wardenPhone || null },
          });
          blockByName.set(key, block);
        }
      } else {
        const first = wardenSeen.get(key);
        const differs = (wardenName && wardenName !== first.wardenName) || (wardenPhone && wardenPhone !== first.wardenPhone);
        if (differs && !warned.has(key)) {
          warned.add(key);
          results.warnings.push(`${blockName}: warden details differ between rows. Using the first row's values.`);
        }
      }

      const existing = await prisma.hostelRoom.findUnique({
        where: { hostelBlockId_roomNo: { hostelBlockId: block.id, roomNo } },
      });

      if (existing) {
        const occ = await prisma.student.count({ where: { hostelRoomId: existing.id, deletedAt: null } });
        if (capacity < occ) throw new Error(`Room ${roomNo} has ${occ} student(s); capacity cannot be lower`);
        await prisma.hostelRoom.update({ where: { id: existing.id }, data: { roomType, capacity, floor: floor || null } });
        results.roomsUpdated++;
      } else {
        await prisma.hostelRoom.create({
          data: { collegeId, hostelBlockId: block.id, roomNo, roomType, capacity, floor: floor || null },
        });
        results.roomsCreated++;
      }
      results.successful++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Row ${rowNo}: ${error.message}`);
    }
  }

  logger.info(`[info] req=${req.id || ''} college=${collegeId} actor=${actorId} Hostel room import: ${results.roomsCreated} created, ${results.roomsUpdated} updated, ${results.failed} failed`);
  res.json({ success: true, data: results });
};

export const getRooms = async (req, res) => {
  const { collegeId } = ctx(req);
  const { blockId } = req.params;

  const block = await prisma.hostelBlock.findFirst({ where: { id: blockId, collegeId } });
  if (!block) return fail(res, 404, 'BLOCK_NOT_FOUND', 'Hostel block not found');

  const rooms = await prisma.hostelRoom.findMany({
    where: { hostelBlockId: blockId, collegeId },
    include: studentCount,
    orderBy: [{ floor: 'asc' }, { roomNo: 'asc' }],
  });

  res.json({
    success: true,
    data: rooms.map((r) => {
      const capacity = r.capacity ?? 0;
      const occupied = r._count.students;
      return { id: r.id, roomNo: r.roomNo, roomType: r.roomType, floor: r.floor, capacity, occupied, status: roomStatus(occupied, capacity) };
    }),
  });
};

export const createRoom = async (req, res) => {
  const { collegeId } = ctx(req);
  const { blockId } = req.params;
  const data = roomSchema.parse(req.body);

  const block = await prisma.hostelBlock.findFirst({ where: { id: blockId, collegeId } });
  if (!block) return fail(res, 404, 'BLOCK_NOT_FOUND', 'Hostel block not found');

  const dup = await prisma.hostelRoom.findUnique({
    where: { hostelBlockId_roomNo: { hostelBlockId: blockId, roomNo: data.roomNo } },
  });
  if (dup) return fail(res, 409, 'ROOM_EXISTS', `Room ${data.roomNo} already exists in this block`);

  const room = await prisma.hostelRoom.create({
    data: { collegeId, hostelBlockId: blockId, roomNo: data.roomNo, roomType: data.roomType, capacity: data.capacity, floor: data.floor || null },
  });
  res.status(201).json({ success: true, data: room });
};

export const updateRoom = async (req, res) => {
  const { collegeId } = ctx(req);
  const { roomId } = req.params;
  const data = updateRoomSchema.parse(req.body);

  const room = await prisma.hostelRoom.findFirst({ where: { id: roomId, collegeId } });
  if (!room) return fail(res, 404, 'ROOM_NOT_FOUND', 'Room not found');

  if (data.capacity !== undefined) {
    const occ = await prisma.student.count({ where: { hostelRoomId: roomId, deletedAt: null } });
    if (data.capacity < occ) {
      return fail(res, 409, 'CAPACITY_BELOW_OCCUPANCY', `${occ} student(s) are in this room. Capacity cannot be lower.`);
    }
  }

  const patch = {};
  if (data.roomType) patch.roomType = data.roomType;
  if (data.capacity !== undefined) patch.capacity = data.capacity;
  if (data.floor !== undefined) patch.floor = data.floor || null;

  const updated = await prisma.hostelRoom.update({ where: { id: roomId }, data: patch });
  res.json({ success: true, data: updated });
};

export const deleteRoom = async (req, res) => {
  const { collegeId } = ctx(req);
  const { roomId } = req.params;

  const room = await prisma.hostelRoom.findFirst({ where: { id: roomId, collegeId } });
  if (!room) return fail(res, 404, 'ROOM_NOT_FOUND', 'Room not found');

  const occ = await prisma.student.count({ where: { hostelRoomId: roomId } });
  if (occ > 0) return fail(res, 409, 'ROOM_HAS_STUDENTS', `${occ} student(s) are in this room. Move them first.`);

  await prisma.hostelRoom.delete({ where: { id: roomId } });
  res.json({ success: true, message: 'Room deleted' });
};