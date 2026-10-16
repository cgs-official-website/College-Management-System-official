import { prisma, logger } from '../../server.js';
import { driverSchema, updateDriverSchema } from './transport.schema.js';

const getCollegeId = (req) => req.tenant?.collegeId || req.user?.collegeId;

const licenseState = (d) => {
  const t = new Date(d).getTime();
  const now = Date.now();
  if (t < now) return 'Expired';
  if (t < now + 30 * 24 * 60 * 60 * 1000) return 'Expiring';
  return 'Valid';
};

const shape = (d) => ({
  id: d.id,
  name: d.name,
  phone: d.phone,
  alternatePhone: d.alternatePhone,
  licenseNo: d.licenseNo,
  licenseExpiry: d.licenseExpiry,
  licenseType: d.licenseType,
  emergencyContact: d.emergencyContact,
  status: d.status,
  licenseState: licenseState(d.licenseExpiry),
  vehicle: d.vehicle ? { id: d.vehicle.id, vehicleNo: d.vehicle.vehicleNo } : null,
});

const handleUnique = (e, res) => {
  if (e.code === 'P2002') {
    const target = String(e.meta?.target || '');
    const message = target.includes('vehicleId') || target.includes('driverId')
      ? 'That vehicle already has a driver'
      : 'A driver with this license number already exists';
    res.status(409).json({ success: false, error: { message } });
    return true;
  }
  return false;
};

export const getDrivers = async (req, res) => {
  const collegeId = getCollegeId(req);
  if (!collegeId) {
    return res.status(400).json({ success: false, error: { message: 'College ID is required' } });
  }

  const drivers = await prisma.driver.findMany({
    where: { collegeId },
    include: { vehicle: true },
    orderBy: { createdAt: 'desc' },
  });

  const data = drivers.map(shape);
  const stats = {
    total: data.length,
    active: data.filter((d) => d.status === 'Active').length,
    assigned: data.filter((d) => d.vehicle).length,
    unassigned: data.filter((d) => !d.vehicle).length,
    expiring: data.filter((d) => d.licenseState === 'Expiring').length,
    expired: data.filter((d) => d.licenseState === 'Expired').length,
  };

  res.json({ success: true, data, stats });
};

const linkVehicle = async (tx, collegeId, driverId, vehicleId) => {
  const vehicle = await tx.vehicle.findFirst({ where: { id: vehicleId, collegeId } });
  if (!vehicle) {
    const err = new Error('Vehicle not found');
    err.status = 400;
    throw err;
  }
  if (vehicle.driverId && vehicle.driverId !== driverId) {
    const err = new Error(`Vehicle ${vehicle.vehicleNo} already has a driver`);
    err.status = 409;
    throw err;
  }
  await tx.vehicle.update({ where: { id: vehicleId }, data: { driverId } });
};

export const createDriver = async (req, res) => {
  const collegeId = getCollegeId(req);
  const { vehicleId, ...payload } = driverSchema.parse(req.body);

  try {
    const driver = await prisma.$transaction(async (tx) => {
      const created = await tx.driver.create({ data: { ...payload, collegeId } });
      if (vehicleId) await linkVehicle(tx, collegeId, created.id, vehicleId);
      return tx.driver.findUnique({ where: { id: created.id }, include: { vehicle: true } });
    });

    logger.info(`[info] college=${collegeId} Created driver ${driver.name}`);
    res.status(201).json({ success: true, data: shape(driver) });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ success: false, error: { message: e.message } });
    if (handleUnique(e, res)) return;
    throw e;
  }
};

export const updateDriver = async (req, res) => {
  const collegeId = getCollegeId(req);
  const { id } = req.params;
  const { vehicleId, ...payload } = updateDriverSchema.parse(req.body);

  const existing = await prisma.driver.findFirst({ where: { id, collegeId }, include: { vehicle: true } });
  if (!existing) {
    return res.status(404).json({ success: false, error: { message: 'Driver not found' } });
  }

  try {
    const driver = await prisma.$transaction(async (tx) => {
      await tx.driver.update({ where: { id }, data: payload });

      if (vehicleId !== undefined) {
        if (existing.vehicle && existing.vehicle.id !== vehicleId) {
          await tx.vehicle.update({ where: { id: existing.vehicle.id }, data: { driverId: null } });
        }
        if (vehicleId) await linkVehicle(tx, collegeId, id, vehicleId);
      }
      return tx.driver.findUnique({ where: { id }, include: { vehicle: true } });
    });

    res.json({ success: true, data: shape(driver) });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ success: false, error: { message: e.message } });
    if (handleUnique(e, res)) return;
    throw e;
  }
};

export const deleteDriver = async (req, res) => {
  const collegeId = getCollegeId(req);
  const { id } = req.params;

  const existing = await prisma.driver.findFirst({ where: { id, collegeId }, include: { vehicle: true } });
  if (!existing) {
    return res.status(404).json({ success: false, error: { message: 'Driver not found' } });
  }
  if (existing.vehicle) {
    return res.status(409).json({
      success: false,
      error: { message: `Driver is linked to vehicle ${existing.vehicle.vehicleNo}. Unlink the driver first.` },
    });
  }

  await prisma.driver.delete({ where: { id } });
  res.json({ success: true, message: 'Driver deleted successfully' });
};