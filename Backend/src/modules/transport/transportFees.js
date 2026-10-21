// Removes allocations for the given students. Unpaid transport fees are deleted,
// fees with any payment are kept (their allocationId becomes null).
export async function releaseTransportFees(tx, collegeId, studentIds) {
  if (!studentIds.length) return { count: 0, feesRemoved: 0, feesKept: 0 };

  const allocs = await tx.studentTransportAllocation.findMany({
    where: { collegeId, studentId: { in: studentIds } },
    select: { id: true },
  });
  const allocIds = allocs.map((a) => a.id);
  if (!allocIds.length) return { count: 0, feesRemoved: 0, feesKept: 0 };

  const fees = await tx.fee.findMany({
    where: { allocationId: { in: allocIds }, feeType: 'Transport Fee' },
    select: { id: true, status: true, amountPaid: true },
  });
  const unpaid = fees.filter((f) => f.status !== 'paid' && Number(f.amountPaid || 0) === 0);
  const unpaidIds = unpaid.map((f) => f.id);

  if (unpaidIds.length) {
    await tx.paymentTransaction.deleteMany({ where: { feeId: { in: unpaidIds } } });
    await tx.fee.deleteMany({ where: { id: { in: unpaidIds } } });
  }
  await tx.studentTransportAllocation.deleteMany({ where: { id: { in: allocIds } } });

  return { count: allocIds.length, feesRemoved: unpaidIds.length, feesKept: fees.length - unpaidIds.length };
}