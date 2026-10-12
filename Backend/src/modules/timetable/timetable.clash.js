const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const DAY_NAMES = {
  0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
  4: 'Thursday', 5: 'Friday', 6: 'Saturday'
};

export const toMinutes = (value) => {
  const match = TIME_RE.exec(String(value || '').trim());
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};

export function validateTimeRange(startTime, endTime) {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  if (start === null || end === null) return 'Times must be in 24-hour HH:MM format.';
  if (end <= start) return 'End time must be after the start time.';
  return null;
}

const teacherLabel = (teacher) => {
  const name = teacher?.user?.name?.trim();
  if (name) return name;
  const email = teacher?.user?.email;
  return email ? email.split('@')[0] : 'This teacher';
};

export async function findClashes(prisma, { collegeId, dayOfWeek, startTime, endTime, teacherId, room, excludeId }) {
  const newStart = toMinutes(startTime);
  const newEnd = toMinutes(endTime);

  const candidates = await prisma.timetableSlot.findMany({
    where: {
      collegeId,
      dayOfWeek,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      OR: [
        { teacherId },
        { room: { equals: room, mode: 'insensitive' } }
      ]
    },
    include: {
      course: { select: { name: true } },
      teacher: { include: { user: { select: { name: true, email: true } } } }
    }
  });

  const clashes = [];
  for (const slot of candidates) {
    const start = toMinutes(slot.startTime);
    const end = toMinutes(slot.endTime);
    if (start === null || end === null) continue;        
    if (!(newStart < end && newEnd > start)) continue;   

    const when = `${DAY_NAMES[slot.dayOfWeek] || 'that day'} ${slot.startTime}–${slot.endTime}`;
    const subject = slot.course?.name || 'another class';

    if (slot.teacherId === teacherId) {
      clashes.push({
        type: 'teacher',
        slotId: slot.id,
        message: `${teacherLabel(slot.teacher)} is already teaching ${subject} on ${when}.`
      });
    }
    if (slot.room.trim().toLowerCase() === room.trim().toLowerCase()) {
      clashes.push({
        type: 'room',
        slotId: slot.id,
        message: `${slot.room} is already booked for ${subject} on ${when}.`
      });
    }
  }
  return clashes;
}