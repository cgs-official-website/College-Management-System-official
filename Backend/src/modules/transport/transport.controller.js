import { prisma, logger } from '../../server.js';
import { createTransportRouteSchema } from './transport.schema.js';

const getRowVal = (row, ...keys) => {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
      return String(row[k]).trim();
    }
  }
  const rowKeys = Object.keys(row || {});
  for (const k of keys) {
    const cleanK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    const foundKey = rowKeys.find(rk => rk.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanK);
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && String(row[foundKey]).trim() !== '') {
      return String(row[foundKey]).trim();
    }
  }
  return '';
};

export const getItems = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;

  if (!collegeId) {
    return res.status(400).json({ success: false, error: { message: 'College ID is required' } });
  }

  const items = await prisma.transportRoute.findMany({
    where: { collegeId },
    orderBy: { id: 'desc' }
  });

  const routes = items.map(item => {
    let parsed = {};
    try {
      const trimmed = (item.name || '').trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        parsed = JSON.parse(trimmed);
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
      studentsCount: Number(parsed.studentsCount || 0),
      status: parsed.status || 'On Time',
    };
  });

  // Safely check if any extra vehicles exist in vehicle table
  try {
    const existingBusNumbers = new Set(
      routes.map(r => String(r.busNumber).toLowerCase().trim())
    );

    const existingVehicles = await prisma.vehicle.findMany({
      where: { collegeId }
    });

    for (const v of existingVehicles) {
      const vNo = String(v.vehicleNo || '').trim();
      if (vNo && !existingBusNumbers.has(vNo.toLowerCase())) {
        routes.push({
          id: v.id,
          name: `Route - ${vNo}`,
          routeName: `Route - ${vNo}`,
          busNumber: vNo,
          driverName: v.driverName || 'Designated Driver',
          driverPhone: v.driverContact || '+91 98765 43210',
          stops: 'Campus Gate, City Center',
          capacity: Number(v.seatingCapacity || 45),
          studentsCount: 0,
          status: 'On Time'
        });
        existingBusNumbers.add(vNo.toLowerCase());
      }
    }
  } catch (vehErr) {
    logger.warn(`Vehicle check skipped in getItems: ${vehErr.message}`);
  }

  const totalBuses = routes.length;
  const activeRoutes = routes.filter(r => r.status !== 'Maintenance').length;
  const registeredStudents = routes.reduce((acc, r) => acc + (r.studentsCount || 0), 0);
  const onTimeCount = routes.filter(r => r.status === 'On Time').length;

  logger.info(`[info] getItems college=${collegeId} returned ${totalBuses} routes`);

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

  // Keep Vehicle table in sync
  if (payload.busNumber) {
    try {
      const existingVehicle = await prisma.vehicle.findFirst({
        where: { collegeId, vehicleNo: payload.busNumber }
      });

      if (existingVehicle) {
        await prisma.vehicle.update({
          where: { id: existingVehicle.id },
          data: {
            driverName: payload.driverName || existingVehicle.driverName,
            driverContact: payload.driverPhone || existingVehicle.driverContact,
            seatingCapacity: payload.capacity || existingVehicle.seatingCapacity
          }
        });
      } else {
        await prisma.vehicle.create({
          data: {
            collegeId,
            vehicleNo: payload.busNumber,
            vehicleType: 'Bus',
            seatingCapacity: payload.capacity || 45,
            driverName: payload.driverName || null,
            driverContact: payload.driverPhone || null
          }
        });
      }
    } catch (vehErr) {
      logger.warn(`Could not sync vehicle record for ${payload.busNumber}: ${vehErr.message}`);
    }
  }

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
    // Check if it's a vehicle ID that was synced
    const existingVehicle = await prisma.vehicle.findFirst({
      where: { id, collegeId }
    });
    if (existingVehicle) {
      await prisma.vehicle.delete({ where: { id } });
      return res.json({ success: true, message: 'Transport vehicle deleted successfully' });
    }
    return res.status(404).json({ success: false, error: { code: 'ROUTE_NOT_FOUND', message: 'Transport route not found' } });
  }

  let busNumber = null;
  try {
    if (existing.name.startsWith('{')) {
      const p = JSON.parse(existing.name);
      busNumber = p.busNumber;
    }
  } catch {}

  await prisma.transportRoute.delete({ where: { id } });

  if (busNumber) {
    try {
      await prisma.vehicle.deleteMany({
        where: { collegeId, vehicleNo: busNumber }
      });
    } catch {}
  }

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
      // Check if row is completely empty
      const rowEntries = Object.entries(row || {}).filter(
        ([_, val]) => val !== undefined && val !== null && String(val).trim() !== ''
      );
      if (rowEntries.length === 0) {
        // Skip empty rows without failing
        continue;
      }

      let routeName = getRowVal(row, 'Route_Name', 'Route Name', 'Route', 'Name', 'Item_Name');
      let vehicleNo = getRowVal(row, 'Bus_Number', 'Bus Number', 'Bus_No', 'Bus No', 'Vehicle_No', 'Vehicle No', 'Vehicle_Number', 'Vehicle Number', 'Bus');
      let driverName = getRowVal(row, 'Driver_Name', 'Driver Name', 'Driver');
      let driverPhone = getRowVal(row, 'Driver_Phone', 'Driver Phone', 'Driver_Contact', 'Driver Contact', 'Contact', 'Phone');
      let stops = getRowVal(row, 'Stops', 'Waypoints', 'Route_Stops', 'Stops_Waypoints');
      let capacityVal = getRowVal(row, 'Capacity', 'Seating_Capacity', 'Seating Capacity', 'Total_Seats');
      let studentsVal = getRowVal(row, 'Students_Count', 'Students Count', 'Registered_Students', 'Students');
      let rawStatus = getRowVal(row, 'Status');

      // Smart fallback: If neither routeName nor vehicleNo matched known keys, map by entry order
      if (!routeName && !vehicleNo) {
        routeName = String(rowEntries[0][1]).trim();
        if (rowEntries.length > 1) {
          vehicleNo = String(rowEntries[1][1]).trim();
        }
      }

      const finalRouteName = routeName || (vehicleNo ? `Route - ${vehicleNo}` : `Route #${index + 1}`);
      const finalBusNumber = vehicleNo || (routeName ? `Bus #${index + 1}` : `Bus #${Math.floor(100 + Math.random() * 900)}`);
      const finalDriverName = driverName || 'Staff Driver';
      const finalDriverPhone = driverPhone || '+91 98765 43210';
      const finalStops = stops || 'Campus Gate, City Center';
      const capacity = capacityVal ? parseInt(capacityVal, 10) : 45;
      const studentsCount = studentsVal ? parseInt(studentsVal, 10) : 0;
      const status = (['On Time', 'Delayed', 'Maintenance', 'Active'].includes(rawStatus)) ? rawStatus : 'On Time';

      // 1. Create TransportRoute so it appears in Active Transport Routes
      const payloadString = JSON.stringify({
        name: finalRouteName,
        busNumber: finalBusNumber,
        driverName: finalDriverName,
        driverPhone: finalDriverPhone,
        stops: finalStops,
        capacity: isNaN(capacity) ? 45 : capacity,
        studentsCount: isNaN(studentsCount) ? 0 : studentsCount,
        status,
        createdAt: new Date().toISOString(),
      });

      await prisma.transportRoute.create({
        data: {
          collegeId,
          name: payloadString
        }
      });

      // 2. Also keep prisma.vehicle synchronized
      if (finalBusNumber) {
        try {
          const insExpiry = row['Insurance_Expiry_Date'] ? new Date(row['Insurance_Expiry_Date']) : null;
          const fcExpiry = row['FC_Expiry_Date'] ? new Date(row['FC_Expiry_Date']) : null;
          const permitExpiry = row['Permit_Expiry_Date'] ? new Date(row['Permit_Expiry_Date']) : null;

          const existingVehicle = await prisma.vehicle.findFirst({
            where: { collegeId, vehicleNo: finalBusNumber }
          });

          if (existingVehicle) {
            await prisma.vehicle.update({
              where: { id: existingVehicle.id },
              data: {
                driverName: finalDriverName,
                driverContact: finalDriverPhone,
                seatingCapacity: isNaN(capacity) ? existingVehicle.seatingCapacity : capacity,
              }
            });
          } else {
            await prisma.vehicle.create({
              data: {
                collegeId,
                vehicleNo: finalBusNumber,
                vehicleType: row['Vehicle_Type'] ? String(row['Vehicle_Type']) : 'Bus',
                seatingCapacity: isNaN(capacity) ? 45 : capacity,
                rcNumber: row['RC_Number'] ? String(row['RC_Number']) : null,
                insuranceExpiryDate: insExpiry && !isNaN(insExpiry) ? insExpiry : null,
                fcExpiryDate: fcExpiry && !isNaN(fcExpiry) ? fcExpiry : null,
                permitExpiryDate: permitExpiry && !isNaN(permitExpiry) ? permitExpiry : null,
                driverName: finalDriverName,
                driverLicenseNo: row['Driver_License_No'] ? String(row['Driver_License_No']) : null,
                driverContact: finalDriverPhone,
              }
            });
          }
        } catch (vehErr) {
          logger.warn(`Non-critical: error syncing vehicle table for ${finalBusNumber}: ${vehErr.message}`);
        }
      }

      results.successful++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Row ${index + 2}: ${error.message}`);
    }
  }

  logger.info(`[info] req=${req.id || ''} college=${collegeId} actor=${actorId} Bulk imported transport routes: ${results.successful} success, ${results.failed} failed`);
  res.json({
    success: true,
    data: results,
    successful: results.successful,
    failed: results.failed,
    errors: results.errors
  });
};
