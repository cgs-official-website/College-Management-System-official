import { prisma, logger } from '../../server.js';
import { routeSchema, updateRouteSchema } from './transport.schema.js';

const getCollegeId = (req) => req.tenant?.collegeId || req.user?.collegeId;

const include = {
  vehicle: { include: { driver: true } },
  _count: { select: { allocations: { where: { student: { deletedAt: null } } } } },
};

const shape = (r) => ({
  id: r.id,
  name: r.name,
  stops: r.stops,
  status: r.status,
  vehicleId: r.vehicleId,
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
  const payload = routeSchema.parse(req.body);

  if (payload.vehicleId) {
    const problem = await checkVehicle(collegeId, payload.vehicleId, null, 0);
    if (problem) return fail(res, problem.status, problem.message);
  }

  try {
    const route = await prisma.transportRoute.create({
      data: { ...payload, collegeId },
      include,
    });
    logger.info(`[info] college=${collegeId} Created route ${route.name}`);
    res.status(201).json({ success: true, data: shape(route) });
  } catch (e) {
    if (e.code === 'P2002') return fail(res, 409, 'That vehicle is already on another route');
    throw e;
  }
};

export const updateRoute = async (req, res) => {
  const collegeId = getCollegeId(req);
  const { id } = req.params;
  const payload = updateRouteSchema.parse(req.body);

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

  try {
    const route = await prisma.transportRoute.update({ where: { id }, data: payload, include });
    res.json({ success: true, data: shape(route) });
  } catch (e) {
    if (e.code === 'P2002') return fail(res, 409, 'That vehicle is already on another route');
    throw e;
  }
};

export const deleteRoute = async (req, res) => {
  const collegeId = getCollegeId(req);
  const { id } = req.params;

  const existing = await prisma.transportRoute.findFirst({ where: { id, collegeId } });
  if (!existing) return fail(res, 404, 'Route not found');

  await prisma.transportRoute.delete({ where: { id } });
  logger.info(`[info] college=${collegeId} Deleted route ${existing.name}`);
  res.json({ success: true, message: 'Route deleted successfully' });
};