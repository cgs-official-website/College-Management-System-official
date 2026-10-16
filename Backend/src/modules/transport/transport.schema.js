import { z } from 'zod';

const optionalDate = z
  .union([z.string(), z.date(), z.null()])
  .optional()
  .transform((v) => {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  });

const normalizeVehicleNo = (s) => String(s).toUpperCase().replace(/\s+/g, ' ').trim();
const normalizeLicense = (s) => String(s).toUpperCase().replace(/\s+/g, '').trim();

export const vehicleSchema = z.object({
  vehicleNo: z.string().min(1, 'Vehicle number is required').transform(normalizeVehicleNo),
  vehicleType: z.string().optional().default('Bus'),
  seatingCapacity: z.coerce.number().int().positive('Seating capacity must be a positive number'),
  rcNumber: z.string().trim().optional().nullable().transform((v) => v || null),
  insuranceExpiryDate: optionalDate,
  fcExpiryDate: optionalDate,
  permitExpiryDate: optionalDate,
  status: z.enum(['Active', 'Under Maintenance']).optional().default('Active'),
  driverId: z.string().uuid().optional().nullable().transform((v) => v || null),
});

export const updateVehicleSchema = vehicleSchema.partial();

export const driverSchema = z.object({
  name: z.string().trim().min(1, 'Driver name is required'),
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, '').slice(-10))
    .refine((v) => v.length === 10, 'Enter a valid 10-digit phone number'),
  alternatePhone: z
    .string()
    .optional()
    .nullable()
    .transform((v) => {
      const d = (v || '').replace(/\D/g, '').slice(-10);
      return d.length === 10 ? d : null;
    }),
  licenseNo: z.string().min(1, 'License number is required').transform(normalizeLicense),
  licenseExpiry: z
    .union([z.string(), z.date()])
    .transform((v) => new Date(v))
    .refine((d) => !isNaN(d.getTime()), 'Valid license expiry date is required'),
  licenseType: z.string().trim().optional().nullable().transform((v) => v || null),
  emergencyContact: z.string().trim().optional().nullable().transform((v) => v || null),
  status: z.enum(['Active', 'On Leave', 'Inactive']).optional().default('Active'),
  vehicleId: z.string().uuid().optional().nullable().transform((v) => v || null),
});

export const updateDriverSchema = driverSchema.partial();

const stopsField = z
  .union([z.array(z.string()), z.string()])
  .optional()
  .transform((v) => {
    const arr = Array.isArray(v) ? v : String(v || '').split(',');
    return arr.map((s) => String(s).trim()).filter(Boolean);
  });

export const routeSchema = z.object({
  name: z.string().trim().min(1, 'Route name is required'),
  stops: stopsField,
  status: z.enum(['On Time', 'Delayed', 'Maintenance']).optional().default('On Time'),
  vehicleId: z.string().uuid().optional().nullable().transform((v) => v || null),
});

export const updateRouteSchema = routeSchema.partial();

export const assignSchema = z.object({
  routeId: z.string().uuid('Route is required'),
  studentIds: z.array(z.string().uuid()).min(1, 'Select at least one student').max(500),
});

export const unassignSchema = z.object({
  studentIds: z.array(z.string().uuid()).min(1, 'Select at least one student').max(500),
});