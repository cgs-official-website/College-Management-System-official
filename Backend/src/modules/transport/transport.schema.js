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

const stopItem = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, 'Stop name is required').max(100),
  fee: z.coerce.number({ invalid_type_error: 'Stop fee must be a number' })
    .min(0, 'Stop fee cannot be negative')
    .max(1000000, 'Stop fee is too large'),
});

const stopsField = z
  .array(stopItem)
  .refine(
    (arr) => new Set(arr.map((s) => s.name.toLowerCase())).size === arr.length,
    'Stop names must be unique within a route'
  );

export const routeSchema = z.object({
  name: z.string().trim().min(1, 'Route name is required'),
  stops: stopsField.default([]),
  status: z.enum(['On Time', 'Delayed', 'Maintenance']).optional().default('On Time'),
  vehicleId: z.string().uuid().optional().nullable().transform((v) => v || null),
});

export const updateRouteSchema = routeSchema.partial();

export const assignSchema = z.object({
  routeId: z.string().uuid('Route is required'),
  stopId: z.string().uuid('Stop is required'),
  studentIds: z.array(z.string().uuid()).min(1, 'Select at least one student').max(500),
});

export const unassignSchema = z.object({
  studentIds: z.array(z.string().uuid()).min(1, 'Select at least one student').max(500),
});

export const termSchema = z.object({
  label: z.string().trim().min(1, 'Term label is required').max(60),
  semester: z.coerce.number().int().min(1, 'Semester must be 1 or more').max(20),
  dueDate: z
    .union([z.string(), z.date()])
    .transform((v) => new Date(v))
    .refine((d) => !isNaN(d.getTime()), 'Valid due date is required'),
  isCurrent: z.boolean().optional().default(false),
});

export const updateTermSchema = termSchema.omit({ isCurrent: true }).partial();

export const changeStopSchema = z.object({
  studentId: z.string().uuid(),
  stopId: z.string().uuid('Stop is required'),
});
