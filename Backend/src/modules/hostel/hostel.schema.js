import { z } from 'zod';

export const ROOM_TYPES = ['Single', 'Double', 'Triple', 'Dormitory'];
export const BLOCK_TYPES = ['Boys', 'Girls', 'Co-Ed', 'Staff'];
export const BLOCK_STATUSES = ['Active', 'Renovation'];

const phone = z.string().trim().regex(/^\d{10}$/, 'Contact must be 10 digits').or(z.literal(''));

export const roomSchema = z.object({
  roomNo: z.string().trim().min(1, 'Room No is required'),
  roomType: z.enum(ROOM_TYPES),
  capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1'),
  floor: z.string().trim().optional(),
});

export const updateRoomSchema = roomSchema.omit({ roomNo: true }).partial();

export const createHostelBlockSchema = z.object({
  name: z.string().trim().min(1, 'Hostel block name is required'),
  type: z.enum(BLOCK_TYPES).default('Boys'),
  wardenName: z.string().trim().optional(),
  wardenPhone: phone.optional(),
  status: z.enum(BLOCK_STATUSES).default('Active'),
  rooms: z.array(roomSchema).min(1, 'Add at least one room'),
}).superRefine((val, ctx) => {
  const seen = new Set();
  val.rooms.forEach((r, i) => {
    const k = r.roomNo.toLowerCase();
    if (seen.has(k)) {
      ctx.addIssue({ code: 'custom', path: ['rooms', i, 'roomNo'], message: `Duplicate room number ${r.roomNo}` });
    }
    seen.add(k);
  });
});

export const updateHostelBlockSchema = z.object({
  name: z.string().trim().min(1).optional(),
  type: z.enum(BLOCK_TYPES).optional(),
  wardenName: z.string().trim().optional(),
  wardenPhone: phone.optional(),
  status: z.enum(BLOCK_STATUSES).optional(),
});