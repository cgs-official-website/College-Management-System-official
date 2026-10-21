import { prisma, logger } from '../../server.js';
import { assignSchema, unassignSchema, changeStopSchema  } from './transport.schema.js';
import { releaseTransportFees } from './transportFees.js';

const getCollegeId = (req) => req.tenant?.collegeId || req.user?.collegeId;
const fail = (res, status, message) => res.status(status).json({ success: false, error: { message } });
const httpError = (status, message) => Object.assign(new Error(message), { status });

const studentSelect = {
  id: true,
  admissionNumber: true,
  rollNumber: true,
  address: true,
  studentMobile: true,
  parentMobile: true,
  customFields: true,
  user: { select: { name: true, email: true } },
  course: { select: { name: true } },
  department: { select: { name: true } },
  section: { select: { name: true } },
};

const nameOf = (s) => {
  const c = s.customFields && typeof s.customFields === 'object' && !Array.isArray(s.customFields) ? s.customFields : {};
  const fromCustom = `${c.firstName || ''} ${c.lastName || ''}`.trim();
  return fromCustom || s.user?.name || s.user?.email?.split('@')[0] || 'Student';
};

const shapeStudent = (s) => ({
  id: s.id,
  name: nameOf(s),
  admissionNo: s.admissionNumber,
  rollNumber: s.rollNumber,
  class: s.course?.name || s.department?.name || '',
  section: s.section?.name || '',
  address: s.address || '',
  phone: s.studentMobile || s.parentMobile || '',
});

export const getWaiting = async (req, res) => {
  const collegeId = getCollegeId(req);
  if (!collegeId) return fail(res, 400, 'College ID is required');

  const where = { collegeId, deletedAt: null, transportRequired: 'Yes', transportAllocation: null };
  const [total, students] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({ where, select: studentSelect, orderBy: { createdAt: 'asc' }, take: 500 }),
  ]);

  res.json({ success: true, data: students.map(shapeStudent), total });
};

export const getAllocations = async (req, res) => {
  const collegeId = getCollegeId(req);
  if (!collegeId) return fail(res, 400, 'College ID is required');

  const { routeId } = req.query;
  const rows = await prisma.studentTransportAllocation.findMany({
    where: { collegeId, ...(routeId ? { routeId } : {}), student: { deletedAt: null } },
    include: {
      student: { select: studentSelect },
      route: { select: { id: true, name: true } },
      stop: { select: { id: true, name: true, fee: true } },
      fees: {
        where: { feeType: 'Transport Fee' },
        select: { status: true, amountDue: true, term: { select: { label: true } } },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { assignedAt: 'desc' },
  });

  res.json({
    success: true,
    data: rows.map((a) => ({
      ...shapeStudent(a.student),
      routeId: a.route.id,
      routeName: a.route.name,
      stopId: a.stop.id,
      stopName: a.stop.name,
      stopFee: Number(a.stop.fee),
      feeStatus: a.fees[0]?.status || null,
      feeTerm: a.fees[0]?.term?.label || null,
      assignedAt: a.assignedAt,
    })),
  });
};

export const assignStudents = async (req, res) => {
  const collegeId = getCollegeId(req);
  const actorId = req.user?.id || req.user?.userId || null;
  const { routeId, stopId, studentIds: rawIds } = assignSchema.parse(req.body);
  const studentIds = [...new Set(rawIds)];

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const locked = await tx.$queryRaw`
          SELECT id FROM "TransportRoute"
          WHERE id = ${routeId}::uuid AND "collegeId" = ${collegeId}::uuid
          FOR UPDATE`;
        if (!locked.length) throw httpError(404, 'Route not found');

        const route = await tx.transportRoute.findUnique({
          where: { id: routeId },
          include: { vehicle: true },
        });
        if (!route.vehicle) throw httpError(400, `Route "${route.name}" has no bus yet. Attach a bus first.`);
        if (route.vehicle.status !== 'Active') {
          throw httpError(400, `Bus ${route.vehicle.vehicleNo} is under maintenance`);
        }

        const stop = await tx.routeStop.findFirst({ where: { id: stopId, routeId, collegeId } });
        if (!stop) throw httpError(400, 'The selected stop does not belong to this route');

        const term = await tx.transportFeeTerm.findFirst({ where: { collegeId, isCurrent: true } });
        if (!term) throw httpError(400, 'No current fee term is set. Set one in the Fee Term tab first.');

        const students = await tx.student.findMany({
          where: { id: { in: studentIds }, collegeId, deletedAt: null },
          select: { id: true, transportRequired: true, transportAllocation: { select: { id: true } } },
        });
        if (students.length !== studentIds.length) {
          throw httpError(400, 'Some selected students were not found. Refresh and try again.');
        }
        if (students.some((s) => s.transportRequired !== 'Yes')) {
          throw httpError(400, 'Some selected students no longer need the bus. Refresh and try again.');
        }
        const already = students.filter((s) => s.transportAllocation).length;
        if (already > 0) {
          throw httpError(409, `${already} selected student(s) already have a bus. Refresh and try again.`);
        }

        const used = await tx.studentTransportAllocation.count({
          where: { routeId, student: { deletedAt: null } },
        });
        const free = route.vehicle.seatingCapacity - used;
        if (studentIds.length > free) {
          throw httpError(
            409,
            free <= 0
              ? `Route "${route.name}" is full (${route.vehicle.seatingCapacity} seats)`
              : `Only ${free} seat(s) left on "${route.name}" but ${studentIds.length} students selected`
          );
        }

        await tx.studentTransportAllocation.createMany({
          data: studentIds.map((studentId) => ({ collegeId, studentId, routeId, stopId, assignedBy: actorId })),
        });

        const amount = Number(stop.fee);
        let feesCreated = 0;
        if (amount > 0) {
          const allocs = await tx.studentTransportAllocation.findMany({
            where: { collegeId, studentId: { in: studentIds } },
            select: { id: true, studentId: true },
          });

          let structure = await tx.feeStructure.findFirst({
            where: { collegeId, semester: term.semester, departmentId: null, totalAmount: amount, dueDate: term.dueDate },
          });
          if (!structure) {
            structure = await tx.feeStructure.create({
              data: { collegeId, semester: term.semester, departmentId: null, totalAmount: amount, dueDate: term.dueDate },
            });
          }

          const created = await tx.fee.createMany({
            data: allocs.map((a) => ({
              collegeId,
              studentId: a.studentId,
              feeStructureId: structure.id,
              status: 'pending',
              amountDue: amount,
              amountPaid: 0,
              feeType: 'Transport Fee',
              termId: term.id,
              allocationId: a.id,
            })),
            skipDuplicates: true,
          });
          feesCreated = created.count;
        }

        return {
          assigned: studentIds.length,
          routeName: route.name,
          stopName: stop.name,
          feeAmount: amount,
          feesCreated,
          termLabel: term.label,
          seatsLeft: free - studentIds.length,
        };
      },
      { timeout: 30000, maxWait: 10000 }
    );

    logger.info(`[info] college=${collegeId} actor=${actorId} Assigned ${result.assigned} students to ${result.routeName} / ${result.stopName}`);
    res.json({ success: true, data: result });
  } catch (e) {
    if (e.status) return fail(res, e.status, e.message);
    if (e.code === 'P2002') return fail(res, 409, 'A selected student already has a bus. Refresh and try again.');
    throw e;
  }
};

export const unassignStudents = async (req, res) => {
  const collegeId = getCollegeId(req);
  const { studentIds } = unassignSchema.parse(req.body);

  const result = await prisma.$transaction((tx) => releaseTransportFees(tx, collegeId, studentIds));

  logger.info(`[info] college=${collegeId} Unassigned ${result.count} students (fees removed ${result.feesRemoved}, kept ${result.feesKept})`);
  res.json({ success: true, data: { unassigned: result.count, feesRemoved: result.feesRemoved, feesKept: result.feesKept } });
};

export const getMyTransport = async (req, res) => {
  const collegeId = getCollegeId(req);
  const userId = req.user?.id || req.user?.userId;

  const student = await prisma.student.findFirst({
    where: { userId, collegeId, deletedAt: null },
    select: {
      transportRequired: true,
      transportAllocation: {
        select: {
          assignedAt: true,
          stop: { select: { name: true, fee: true } },
          fees: {
            where: { feeType: 'Transport Fee' },
            select: { id: true, status: true, amountDue: true, amountPaid: true, term: { select: { label: true } } },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          route: {
            select: {
              id: true,
              name: true,
              stops: { orderBy: { sequence: 'asc' }, select: { name: true } },
              status: true,
              vehicle: {
                select: {
                  vehicleNo: true,
                  vehicleType: true,
                  seatingCapacity: true,
                  driver: { select: { name: true, phone: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!student) return fail(res, 404, 'Student profile not found');

  const alloc = student.transportAllocation;
  const needsBus = student.transportRequired === 'Yes';
  const state = alloc ? 'assigned' : needsBus ? 'waiting' : 'none';

  res.json({
    success: true,
    data: {
      state,
      transportRequired: student.transportRequired === 'Yes' ? 'Yes' : 'No',
      route: alloc
        ? {
            name: alloc.route.name,
            stops: alloc.route.stops.map((s) => s.name),
            status: alloc.route.status,
            assignedAt: alloc.assignedAt,
            stop: alloc.stop?.name || null,
            fee: alloc.fees[0]
              ? {
                  id: alloc.fees[0].id,
                  amount: Number(alloc.fees[0].amountDue),
                  paid: Number(alloc.fees[0].amountPaid),
                  status: alloc.fees[0].status,
                  term: alloc.fees[0].term?.label || null,
                }
              : null,
            bus: alloc.route.vehicle
              ? {
                  vehicleNo: alloc.route.vehicle.vehicleNo,
                  vehicleType: alloc.route.vehicle.vehicleType,
                  seatingCapacity: alloc.route.vehicle.seatingCapacity,
                }
              : null,
            driver: alloc.route.vehicle?.driver || null,
          }
        : null,
    },
  });
};

export const changeStop = async (req, res) => {
  const collegeId = getCollegeId(req);
  const { studentId, stopId } = changeStopSchema.parse(req.body);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const alloc = await tx.studentTransportAllocation.findFirst({
        where: { studentId, collegeId, student: { deletedAt: null } },
        include: { stop: true },
      });
      if (!alloc) throw httpError(404, 'This student is not assigned to a bus');
      if (alloc.stopId === stopId) throw httpError(400, 'The student is already on this stop');

      const stop = await tx.routeStop.findFirst({ where: { id: stopId, routeId: alloc.routeId, collegeId } });
      if (!stop) throw httpError(400, 'The new stop must belong to the same route');

      const fee = await tx.fee.findFirst({
        where: { allocationId: alloc.id, feeType: 'Transport Fee' },
        orderBy: { createdAt: 'desc' },
      });

      if (fee && (fee.status === 'paid' || Number(fee.amountPaid || 0) > 0)) {
        throw httpError(409, 'The transport fee is already paid, so the stop cannot be changed.');
      }

      const amount = Number(stop.fee);
      if (fee) {
        if (amount > 0) {
          const term = fee.termId ? await tx.transportFeeTerm.findUnique({ where: { id: fee.termId } }) : null;
          let structure = term
            ? await tx.feeStructure.findFirst({
                where: { collegeId, semester: term.semester, departmentId: null, totalAmount: amount, dueDate: term.dueDate },
              })
            : null;
          if (!structure && term) {
            structure = await tx.feeStructure.create({
              data: { collegeId, semester: term.semester, departmentId: null, totalAmount: amount, dueDate: term.dueDate },
            });
          }
          await tx.fee.update({
            where: { id: fee.id },
            data: { amountDue: amount, ...(structure ? { feeStructureId: structure.id } : {}) },
          });
        } else {
          await tx.paymentTransaction.deleteMany({ where: { feeId: fee.id } });
          await tx.fee.delete({ where: { id: fee.id } });
        }
      }

      await tx.studentTransportAllocation.update({ where: { id: alloc.id }, data: { stopId } });
      return { stopName: stop.name, feeAmount: amount };
    });

    res.json({ success: true, data: result });
  } catch (e) {
    if (e.status) return fail(res, e.status, e.message);
    throw e;
  }
};