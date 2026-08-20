import { prisma } from '../../server.js';
import { scheduleSlotSchema } from './timetable.schema.js';

export const scheduleSlot = async (req, res) => {
  try {
    const { collegeId } = req.tenant;
    const data = scheduleSlotSchema.parse(req.body);

    // The Prisma schema handles double-booking explicitly:
    // @@unique([collegeId, dayOfWeek, startTime, room], name: "unique_room_booking")
    // @@unique([collegeId, dayOfWeek, startTime, teacherId], name: "unique_teacher_booking")
    // A violation will throw a P2002 error from Postgres.

    const slot = await prisma.timetableSlot.create({
      data: {
        collegeId,
        ...data
      }
    });

    res.status(201).json({ data: slot });
  } catch (error) {
    if (error.code === 'P2002') {
      const target = error.meta?.target;
      if (target?.includes('room')) {
        return res.status(422).json({ error: 'Room is already booked for this time slot' });
      }
      if (target?.includes('teacherId')) {
        return res.status(422).json({ error: 'Teacher is already scheduled for this time slot' });
      }
      return res.status(422).json({ error: 'Double booking detected' });
    }
    res.status(400).json({ error: { message: error.message } });
  }
};
