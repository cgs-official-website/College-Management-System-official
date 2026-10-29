// A due date counts through the END of that day in India (IST).
// dueDate is stored as the picked date at midnight UTC, so we read its calendar date
// and treat 23:59:59.999 IST on that date as the deadline.
const IST_OFFSET = '+05:30';

export function getAssignmentDeadline(dueDate) {
  const ymd = new Date(dueDate).toISOString().slice(0, 10);
  return new Date(`${ymd}T23:59:59.999${IST_OFFSET}`);
}

export function isPastDeadline(dueDate, now = new Date()) {
  return now.getTime() > getAssignmentDeadline(dueDate).getTime();
}