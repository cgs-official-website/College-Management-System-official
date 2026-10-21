import { prisma, logger } from '../../server.js';
import { routeSchema, updateRouteSchema } from './transport.schema.js';
import { releaseTransportFees } from './transportFees.js';

const getCollegeId = (req) => req.tenant?.collegeId || req.user?.collegeId;
const liveStudents = { student: { deletedAt: null } };

const include = {
  vehicle: { include: { driver: true } },
  stops: {
    orderBy: { sequence: 'asc' },
    include: { _count: { select: { allocations: { where: liveStudents } } } },
  },
  _count: { select: { allocations: { where: liveStudents } } },
};

const shape = (r) => ({
  id: r.id,
  name: r.name,
  status: r.status,
  vehicleId: r.vehicleId,
  stops: r.stops.map((s) => ({
    id: s.id,
    name: s.name,
    sequence: s.sequence,
    fee: Number(s.fee),
    studentsCount: s._count.allocations,
  })),
  vehicle: r.vehicle
    ? {
        id: r.vehicle.id,
        vehicleNo: r.vehicle.vehicleNo,
        seatingCapacity: r.vehicle.seatingCapacity,
        driver: r.vehicle.driver
          ? { id: r.vehicle.driver.id, name: r.vehicle.driver.name, phone: r.vehicle.driver.phone }
          : null,
      }
    : null,
  studentsCount: r._count.allocations,
  seats: r.vehicle?.seatingCapacity ?? 0,
});

const fail = (res, status, message) =>
  res.status(status).json({ success: false, error: { message } });

const checkVehicle = async (collegeId, vehicleId, routeId, studentsOnRoute) => {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, collegeId },
    include: { route: true },
  });
  if (!vehicle) return { status: 400, message: 'Vehicle not found' };
  if (vehicle.route && vehicle.route.id !== routeId) {
    return { status: 409, message: `Vehicle ${vehicle.vehicleNo} is already on route "${vehicle.route.name}"` };
  }
  if (vehicle.status !== 'Active') {
    return { status: 400, message: `Vehicle ${vehicle.vehicleNo} is under maintenance` };
  }
  if (vehicle.seatingCapacity < studentsOnRoute) {
    return {
      status: 400,
      message: `Vehicle has ${vehicle.seatingCapacity} seats but ${studentsOnRoute} students are already assigned to this route`,
    };
  }
  return null;
};

const uniqueMessage = (e) =>
  String(e.meta?.target || '').includes('vehicleId')
    ? 'That vehicle is already on another route'
    : 'Stop names must be unique within a route';

export const getRoutes = async (req, res) => {
  const collegeId = getCollegeId(req);
  if (!collegeId) return fail(res, 400, 'College ID is required');

  const [routes, studentsWaiting] = await Promise.all([
    prisma.transportRoute.findMany({ where: { collegeId }, include, orderBy: { createdAt: 'desc' } }),
    prisma.student.count({
      where: { collegeId, deletedAt: null, transportRequired: 'Yes', transportAllocation: null },
    }),
  ]);

  const data = routes.map(shape);
  const stats = {
    totalRoutes: data.length,
    withBus: data.filter((r) => r.vehicle).length,
    withoutBus: data.filter((r) => !r.vehicle).length,
    studentsAssigned: data.reduce((n, r) => n + r.studentsCount, 0),
    studentsWaiting,
  };

  res.json({ success: true, data, stats });
};

export const createRoute = async (req, res) => {
  const collegeId = getCollegeId(req);
  const { stops, ...payload } = routeSchema.parse(req.body);

  if (payload.vehicleId) {
    const problem = await checkVehicle(collegeId, payload.vehicleId, null, 0);
    if (problem) return fail(res, problem.status, problem.message);
  }

  try {
    const route = await prisma.transportRoute.create({
      data: {
        ...payload,
        collegeId,
        stops: {
          create: stops.map((s, i) => ({ collegeId, name: s.name, fee: s.fee, sequence: i + 1 })),
        },
      },
      include,
    });
    logger.info(`[info] college=${collegeId} Created route ${route.name} with ${stops.length} stops`);
    res.status(201).json({ success: true, data: shape(route) });
  } catch (e) {
    if (e.code === 'P2002') return fail(res, 409, uniqueMessage(e));
    throw e;
  }
};

export const updateRoute = async (req, res) => {
  const collegeId = getCollegeId(req);
  const { id } = req.params;
  const { stops, ...payload } = updateRouteSchema.parse(req.body);

  const existing = await prisma.transportRoute.findFirst({ where: { id, collegeId }, include });
  if (!existing) return fail(res, 404, 'Route not found');

  const students = existing._count.allocations;

  if (payload.vehicleId !== undefined && payload.vehicleId !== existing.vehicleId) {
    if (payload.vehicleId) {
      const problem = await checkVehicle(collegeId, payload.vehicleId, id, students);
      if (problem) return fail(res, problem.status, problem.message);
    } else if (students > 0) {
      return fail(res, 400, `${students} students are assigned to this route. Unassign them before removing the bus.`);
    }
  }

  let removedIds = [];
  if (stops) {
    const known = new Set(existing.stops.map((s) => s.id));
    const foreign = stops.find((s) => s.id && !known.has(s.id));
    if (foreign) return fail(res, 400, `Stop "${foreign.name}" does not belong to this route`);

    const keep = new Set(stops.filter((s) => s.id).map((s) => s.id));
    const removed = existing.stops.filter((s) => !keep.has(s.id));
    const blocked = removed.find((s) => s._count.allocations > 0);
    if (blocked) {
      return fail(res, 409, `Stop "${blocked.name}" has ${blocked._count.allocations} student(s). Unassign them before removing it.`);
    }
    removedIds = removed.map((s) => s.id);
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        if (Object.keys(payload).length) {
          await tx.transportRoute.update({ where: { id }, data: payload });
        }
        if (!stops) return;

        if (removedIds.length) {
          await tx.studentTransportAllocation.deleteMany({
            where: { stopId: { in: removedIds }, student: { deletedAt: { not: null } } },
          });
          await tx.routeStop.deleteMany({ where: { id: { in: removedIds } } });
        }

        for (const s of stops.filter((x) => x.id)) {
          await tx.routeStop.update({ where: { id: s.id }, data: { name: `__tmp_${s.id}` } });
        }
        for (const [i, s] of stops.entries()) {
          if (s.id) {
            await tx.routeStop.update({ where: { id: s.id }, data: { name: s.name, fee: s.fee, sequence: i + 1 } });
          } else {
            await tx.routeStop.create({ data: { collegeId, routeId: id, name: s.name, fee: s.fee, sequence: i + 1 } });
          }
        }
      },
      { timeout: 30000, maxWait: 10000 }
    );

    const route = await prisma.transportRoute.findUnique({ where: { id }, include });
    res.json({ success: true, data: shape(route) });
  } catch (e) {
    if (e.code === 'P2002') return fail(res, 409, uniqueMessage(e));
    if (e.code === 'P2003') return fail(res, 409, 'A stop still has students assigned. Refresh and try again.');
    throw e;
  }
};

export const deleteRoute = async (req, res) => {
  const collegeId = getCollegeId(req);
  const { id } = req.params;

  const existing = await prisma.transportRoute.findFirst({ where: { id, collegeId } });
  if (!existing) return fail(res, 404, 'Route not found');

  await prisma.$transaction(async (tx) => {
    const allocs = await tx.studentTransportAllocation.findMany({
      where: { routeId: id },
      select: { studentId: true },
    });
    await releaseTransportFees(tx, collegeId, allocs.map((a) => a.studentId));
    await tx.transportRoute.delete({ where: { id } });
  }, { timeout: 30000, maxWait: 10000 });

  logger.info(`[info] college=${collegeId} Deleted route ${existing.name}`);
  res.json({ success: true, message: 'Route deleted successfully' });
};