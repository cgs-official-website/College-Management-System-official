export async function deleteUserRecords(tx, userId) {
  await tx.leaveRequest.deleteMany({ where: { requesterUserId: userId } });
  await tx.leaveRequest.updateMany({ where: { reviewedBy: userId }, data: { reviewedBy: null } });
  await tx.department.updateMany({ where: { hodUserId: userId }, data: { hodUserId: null } });

  await tx.infrastructureBooking.deleteMany({ where: { requesterUserId: userId } });
  await tx.infrastructureBooking.updateMany({ where: { reviewedByUserId: userId }, data: { reviewedByUserId: null } });
  await tx.complaint.deleteMany({ where: { userId } });
  await tx.platformTicket.deleteMany({ where: { adminUserId: userId } });
  await tx.payroll.deleteMany({ where: { staffId: userId } });
  await tx.payrollRecord.deleteMany({ where: { userId } });
  await tx.timesheet.deleteMany({ where: { userId } });
  await tx.parent.deleteMany({ where: { userId } });
  await tx.user.delete({ where: { id: userId } });
}

export async function deleteTeacherProfile(tx, teacher) {
  const assignments = await tx.assignment.findMany({ where: { teacherId: teacher.id }, select: { id: true } });
  if (assignments.length) {
    await tx.assignmentSubmission.deleteMany({ where: { assignmentId: { in: assignments.map(({ id }) => id) } } });
    await tx.assignment.deleteMany({ where: { teacherId: teacher.id } });
  }
  await tx.attendance.deleteMany({ where: { teacherId: teacher.id } });
  await tx.timetableSlot.deleteMany({ where: { teacherId: teacher.id } });
  await tx.leaveRequest.updateMany({ where: { substituteTeacherId: teacher.id }, data: { substituteTeacherId: null } });
  await tx.teacher.delete({ where: { id: teacher.id } });
  await deleteUserRecords(tx, teacher.userId);
}

export async function deleteStudentProfile(tx, student) {
  const fees = await tx.fee.findMany({ where: { studentId: student.id }, select: { id: true } });
  if (fees.length) {
    await tx.paymentTransaction.deleteMany({ where: { feeId: { in: fees.map(({ id }) => id) } } });
  }
  await tx.assignmentSubmission.deleteMany({ where: { studentId: student.id } });
  await tx.attendance.deleteMany({ where: { studentId: student.id } });
  await tx.enrollment.deleteMany({ where: { studentId: student.id } });
  await tx.fee.deleteMany({ where: { studentId: student.id } });
  await tx.mark.deleteMany({ where: { studentId: student.id } });
  await tx.scholarship.deleteMany({ where: { studentId: student.id } });
  await tx.parentStudentLink.deleteMany({ where: { studentId: student.id } });
  await tx.student.delete({ where: { id: student.id } });
  await deleteUserRecords(tx, student.userId);
}