import { prisma, logger } from '../../server.js';
import { vehicleSchema, updateVehicleSchema,  driverSchema } from './transport.schema.js';

const getCollegeId = (req) => req.tenant?.collegeId || req.user?.collegeId;

const complianceOf = (v) => {
  const dates = [v.insuranceExpiryDate, v.fcExpiryDate, v.permitExpiryDate].filter(Boolean);
  if (dates.length === 0) return 'Not Provided';
  const now = Date.now();
  const soon = now + 30 * 24 * 60 * 60 * 1000;
  const times = dates.map((d) => new Date(d).getTime());
  if (times.some((t) => t < now)) return 'Expired';
  if (times.some((t) => t < soon)) return 'Expiring';
  return 'Valid';
};

const shape = (v) => ({
  id: v.id,
  vehicleNo: v.vehicleNo,
  vehicleType: v.vehicleType,
  seatingCapacity: v.seatingCapacity,
  rcNumber: v.rcNumber,
  insuranceExpiryDate: v.insuranceExpiryDate,
  fcExpiryDate: v.fcExpiryDate,
  permitExpiryDate: v.permitExpiryDate,
  status: v.status,
  driverId: v.driverId,
  driver: v.driver ? { id: v.driver.id, name: v.driver.name, phone: v.driver.phone } : null,
  route: v.route ? { id: v.route.id, name: v.route.name } : null,
  compliance: complianceOf(v),
});

const handleUnique = (e, res) => {
  if (e.code === 'P2002') {
    const target = String(e.meta?.target || '');
    const message = target.includes('driverId')
      ? 'That driver is already assigned to another vehicle'
      : 'A vehicle with this registration number already exists';
    res.status(409).json({ success: false, error: { message } });
    return true;
  }
  return false;
};

export const getVehicles = async (req, res) => {
  const collegeId = getCollegeId(req);
  if (!collegeId) {
    return res.status(400).json({ success: false, error: { message: 'College ID is required' } });
  }

  const vehicles = await prisma.vehicle.findMany({
    where: { collegeId },
    include: { driver: true, route: true },
    orderBy: { createdAt: 'desc' },
  });

  const data = vehicles.map(shape);
  const stats = {
    total: data.length,
    active: data.filter((v) => v.status === 'Active').length,
    assigned: data.filter((v) => v.route).length,
    unassigned: data.filter((v) => !v.route).length,
    expiring: data.filter((v) => v.compliance === 'Expiring').length,
    expired: data.filter((v) => v.compliance === 'Expired').length,
  };

  res.json({ success: true, data, stats });
};

export const createVehicle = async (req, res) => {
  const collegeId = getCollegeId(req);
  const payload = vehicleSchema.parse(req.body);

  try {
    if (payload.driverId) {
      const driver = await prisma.driver.findFirst({ where: { id: payload.driverId, collegeId } });
      if (!driver) {
        return res.status(400).json({ success: false, error: { message: 'Driver not found' } });
      }
    }

    const vehicle = await prisma.vehicle.create({
      data: { ...payload, collegeId },
      include: { driver: true, route: true },
    });

    logger.info(`[info] college=${collegeId} Created vehicle ${vehicle.vehicleNo}`);
    res.status(201).json({ success: true, data: shape(vehicle) });
  } catch (e) {
    if (handleUnique(e, res)) return;
    throw e;
  }
};

export const updateVehicle = async (req, res) => {
  const collegeId = getCollegeId(req);
  const { id } = req.params;
  const payload = updateVehicleSchema.parse(req.body);

  const existing = await prisma.vehicle.findFirst({
    where: { id, collegeId },
        include: {
      route: {
        include: {
          _count: { select: { allocations: { where: { student: { deletedAt: null } } } } },
        },
      },
    },
  });
  if (!existing) {
    return res.status(404).json({ success: false, error: { message: 'Vehicle not found' } });
  }

  if (payload.seatingCapacity && existing.route) {
    const assigned = existing.route._count.allocations;
    if (payload.seatingCapacity < assigned) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Cannot set ${payload.seatingCapacity} seats: ${assigned} students are already assigned to route "${existing.route.name}"`,
        },
      });
    }
  }

  if (payload.driverId) {
    const driver = await prisma.driver.findFirst({ where: { id: payload.driverId, collegeId } });
    if (!driver) {
      return res.status(400).json({ success: false, error: { message: 'Driver not found' } });
    }
  }

  try {
    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: payload,
      include: { driver: true, route: true },
    });
    res.json({ success: true, data: shape(vehicle) });
  } catch (e) {
    if (handleUnique(e, res)) return;
    throw e;
  }
};

export const deleteVehicle = async (req, res) => {
  const collegeId = getCollegeId(req);
  const { id } = req.params;

  const existing = await prisma.vehicle.findFirst({
    where: { id, collegeId },
    include: { route: true },
  });
  if (!existing) {
    return res.status(404).json({ success: false, error: { message: 'Vehicle not found' } });
  }
  if (existing.route) {
    return res.status(409).json({
      success: false,
      error: { message: `Vehicle is attached to route "${existing.route.name}". Remove it from the route first.` },
    });
  }

  await prisma.vehicle.delete({ where: { id } });
  res.json({ success: true, message: 'Vehicle deleted successfully' });
};

const parseDateCell = (raw) => {
  if (raw === undefined || raw === null || String(raw).trim() === '') return { value: null };
  const s = String(raw).trim();

  if (/^\d{5}$/.test(s)) {
    const d = new Date(Math.round((Number(s) - 25569) * 86400 * 1000));
    return isNaN(d.getTime()) ? { error: true } : { value: d };
  }
  let m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) {
    const d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
    return d.getUTCMonth() === +m[2] - 1 ? { value: d } : { error: true };
  }
  m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) {
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCMonth() === +m[2] - 1 ? { value: d } : { error: true };
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? { error: true } : { value: d };
};

const getRowVal = (row, ...keys) => {
  const rowKeys = Object.keys(row || {});
  for (const k of keys) {
    const clean = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    const found = rowKeys.find((rk) => rk.toLowerCase().replace(/[^a-z0-9]/g, '') === clean);
    if (found && row[found] !== undefined && row[found] !== null && String(row[found]).trim() !== '') {
      return String(row[found]).trim();
    }
  }
  return '';
};

export const bulkImportVehicles = async (req, res) => {
  const collegeId = getCollegeId(req);
  const { data } = req.body;

  if (!collegeId) {
    return res.status(400).json({ success: false, error: { message: 'College ID is required' } });
  }
  if (!Array.isArray(data) || data.length === 0) {
    return res.status(400).json({ success: false, error: { message: 'No data provided for import' } });
  }

  const results = { successful: 0, failed: 0, errors: [] };
  const fail = (rowNo, msg) => { results.failed++; results.errors.push(`Row ${rowNo}: ${msg}`); };

  const [existingVehicles, existingDrivers] = await Promise.all([
    prisma.vehicle.findMany({ where: { collegeId }, select: { vehicleNo: true } }),
    prisma.driver.findMany({ where: { collegeId }, include: { vehicle: { select: { vehicleNo: true } } } }),
  ]);
  const takenVehicleNos = new Set(existingVehicles.map((v) => v.vehicleNo));
  const driversByLicense = new Map(existingDrivers.map((d) => [d.licenseNo, d]));
  const driversUsedInFile = new Set();

  const valid = [];
  for (const [index, row] of data.entries()) {
    const rowNo = index + 2;
    const hasValue = Object.values(row || {}).some((v) => v !== undefined && v !== null && String(v).trim() !== '');
    if (!hasValue) continue;

    const dates = {
      insuranceExpiryDate: parseDateCell(getRowVal(row, 'Insurance_Expiry_Date', 'Insurance Expiry')),
      fcExpiryDate: parseDateCell(getRowVal(row, 'FC_Expiry_Date', 'FC Expiry')),
      permitExpiryDate: parseDateCell(getRowVal(row, 'Permit_Expiry_Date', 'Permit Expiry')),
    };
    const badDate = Object.entries(dates).find(([, d]) => d.error);
    if (badDate) { fail(rowNo, `invalid date in ${badDate[0]} (use DD-MM-YYYY or YYYY-MM-DD)`); continue; }

    const parsed = vehicleSchema.omit({ driverId: true }).safeParse({
      vehicleNo: getRowVal(row, 'Vehicle_No', 'Vehicle No', 'Bus_Number', 'Bus Number', 'Registration_No'),
      seatingCapacity: getRowVal(row, 'Seating_Capacity', 'Seating Capacity', 'Capacity', 'Total_Seats'),
      vehicleType: getRowVal(row, 'Vehicle_Type', 'Vehicle Type') || 'Bus',
      rcNumber: getRowVal(row, 'RC_Number', 'RC Number') || null,
      insuranceExpiryDate: null,
      fcExpiryDate: null,
      permitExpiryDate: null,
    });
    if (!parsed.success) { fail(rowNo, parsed.error.issues.map((i) => i.message).join(', ')); continue; }

    const vehicle = {
      ...parsed.data,
      insuranceExpiryDate: dates.insuranceExpiryDate.value,
      fcExpiryDate: dates.fcExpiryDate.value,
      permitExpiryDate: dates.permitExpiryDate.value,
    };

    if (takenVehicleNos.has(vehicle.vehicleNo)) { fail(rowNo, `${vehicle.vehicleNo} already exists`); continue; }

    let driver = null;
    const driverName = getRowVal(row, 'Driver_Name', 'Driver Name', 'Driver');
    if (driverName) {
      const dp = driverSchema.omit({ vehicleId: true }).safeParse({
        name: driverName,
        phone: getRowVal(row, 'Driver_Phone', 'Driver Phone', 'Phone', 'Contact'),
        licenseNo: getRowVal(row, 'License_No', 'License No', 'Driver_License_No'),
        licenseExpiry: dates && parseDateCell(getRowVal(row, 'License_Expiry_Date', 'License Expiry')).value || '',
      });
      if (!dp.success) { fail(rowNo, `driver "${driverName}": ${dp.error.issues.map((i) => i.message).join(', ')}`); continue; }
      driver = dp.data;

      const existing = driversByLicense.get(driver.licenseNo);
      if (existing?.vehicle) { fail(rowNo, `driver ${driver.name} is already linked to ${existing.vehicle.vehicleNo}`); continue; }
      if (driversUsedInFile.has(driver.licenseNo)) { fail(rowNo, `driver ${driver.name} is already used on another row`); continue; }
      driversUsedInFile.add(driver.licenseNo);
    }

    takenVehicleNos.add(vehicle.vehicleNo);
    valid.push({ rowNo, vehicle, driver });
  }

  if (valid.length > 0) {
    try {
      await prisma.$transaction(
        async (tx) => {
          const newDrivers = valid.filter((v) => v.driver && !driversByLicense.has(v.driver.licenseNo));
          if (newDrivers.length) {
            await tx.driver.createMany({
              data: newDrivers.map((v) => ({ ...v.driver, collegeId })),
              skipDuplicates: true,
            });
          }
          const licenses = valid.filter((v) => v.driver).map((v) => v.driver.licenseNo);
          const drivers = licenses.length
            ? await tx.driver.findMany({ where: { collegeId, licenseNo: { in: licenses } }, select: { id: true, licenseNo: true } })
            : [];
          const idByLicense = new Map(drivers.map((d) => [d.licenseNo, d.id]));

          await tx.vehicle.createMany({
            data: valid.map((v) => ({
              ...v.vehicle,
              collegeId,
              driverId: v.driver ? idByLicense.get(v.driver.licenseNo) || null : null,
            })),
            skipDuplicates: true,
          });
        },
        { timeout: 60000, maxWait: 10000 }
      );
      results.successful = valid.length;
    } catch (e) {
      valid.forEach((v) => fail(v.rowNo, `not saved: ${e.message}`));
    }
  }

  logger.info(`[info] college=${collegeId} Vehicle import: ${results.successful} ok, ${results.failed} failed`);
  res.json({
    success: true,
    data: results,
    successful: results.successful,
    failed: results.failed,
    errors: results.errors,
  });
};