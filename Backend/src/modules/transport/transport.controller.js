import { prisma, logger } from '../../server.js';
import { createTransportRouteSchema } from './transport.schema.js';

export const getItems = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const items = await prisma.transportRoute.findMany({
    where: { collegeId },
    orderBy: { id: 'desc' }
  });

  const routes = items.map(item => {
    let parsed = {};
    try {
      if (item.name.startsWith('{')) {
        parsed = JSON.parse(item.name);
      }
    } catch {
      // Plain name string
    }

    return {
      id: item.id,
      name: parsed.name || item.name,
      routeName: parsed.name || item.name,
      busNumber: parsed.busNumber || 'Bus #' + item.id.slice(0, 4).toUpperCase(),
      driverName: parsed.driverName || 'Designated Driver',
      driverPhone: parsed.driverPhone || '+91 98765 43210',
      stops: parsed.stops || 'Campus Gate, City Center',
      capacity: Number(parsed.capacity || 50),
      studentsCount: Number(parsed.studentsCount || 32),
      status: parsed.status || 'On Time',
    };
  });

  const totalBuses = routes.length;
  const activeRoutes = routes.filter(r => r.status !== 'Maintenance').length;
  const registeredStudents = routes.reduce((acc, r) => acc + (r.studentsCount || 0), 0);
  const onTimeCount = routes.filter(r => r.status === 'On Time').length;

  res.json({
    success: true,
    data: routes,
    stats: {
      totalBuses,
      activeRoutes,
      registeredStudents,
      onTimeCount,
      qrScansToday: registeredStudents > 0 ? registeredStudents * 2 : (totalBuses * 45)
    }
  });
};

export const createItem = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const payload = createTransportRouteSchema.parse(req.body);

  const payloadString = JSON.stringify({
    name: payload.name,
    busNumber: payload.busNumber,
    driverName: payload.driverName,
    driverPhone: payload.driverPhone,
    stops: payload.stops,
    capacity: payload.capacity,
    studentsCount: payload.studentsCount,
    status: payload.status,
    createdAt: new Date().toISOString(),
  });

  const item = await prisma.transportRoute.create({
    data: {
      collegeId,
      name: payloadString
    }
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} routeId=${item.id} actor=${actorId} Created transport route '${payload.name}'`);
  res.status(201).json({ success: true, data: item });
};

export const deleteItem = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { id } = req.params;

  const existing = await prisma.transportRoute.findFirst({
    where: { id, collegeId }
  });

  if (!existing) {
    return res.status(404).json({ success: false, error: { code: 'ROUTE_NOT_FOUND', message: 'Transport route not found' } });
  }

  await prisma.transportRoute.delete({ where: { id } });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} routeId=${id} actor=${actorId} Deleted transport route`);
  res.json({ success: true, message: 'Transport route deleted successfully' });
};

export const bulkImportVehicles = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { data } = req.body;

  if (!collegeId) {
    return res.status(400).json({ success: false, error: { message: 'College ID is required' } });
  }
  
  if (!Array.isArray(data) || data.length === 0) {
    return res.status(400).json({ success: false, error: { message: 'No data provided for import' } });
  }

  const results = { successful: 0, failed: 0, errors: [] };
  
  for (const [index, row] of data.entries()) {
    try {
      const vehicleNo = String(row['Vehicle_No*'] || row['Vehicle_No'] || '').trim();

      if (!vehicleNo) {
        throw new Error('Vehicle_No is required');
      }

      const insExpiry = row['Insurance_Expiry_Date'] ? new Date(row['Insurance_Expiry_Date']) : null;
      const fcExpiry = row['FC_Expiry_Date'] ? new Date(row['FC_Expiry_Date']) : null;
      const permitExpiry = row['Permit_Expiry_Date'] ? new Date(row['Permit_Expiry_Date']) : null;

      await prisma.vehicle.create({
        data: {
          collegeId,
          vehicleNo: vehicleNo,
          vehicleType: row['Vehicle_Type'] ? String(row['Vehicle_Type']) : null,
          seatingCapacity: row['Seating_Capacity'] ? parseInt(row['Seating_Capacity'], 10) : null,
          rcNumber: row['RC_Number'] ? String(row['RC_Number']) : null,
          insuranceExpiryDate: insExpiry && !isNaN(insExpiry) ? insExpiry : null,
          fcExpiryDate: fcExpiry && !isNaN(fcExpiry) ? fcExpiry : null,
          permitExpiryDate: permitExpiry && !isNaN(permitExpiry) ? permitExpiry : null,
          driverName: row['Driver_Name'] ? String(row['Driver_Name']) : null,
          driverLicenseNo: row['Driver_License_No'] ? String(row['Driver_License_No']) : null,
          driverContact: row['Driver_Contact'] ? String(row['Driver_Contact']) : null,
        }
      });

      results.successful++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Row ${index + 2}: ${error.message}`);
    }
  }

  logger.info(`[info] req=${req.id || ''} college=${collegeId} actor=${actorId} Bulk imported vehicles: ${results.successful} success, ${results.failed} failed`);
  res.json({ success: true, data: results });
};
