import { z } from 'zod';

export const createTransportRouteSchema = z.object({
  name: z.string().min(1, 'Route name is required'),
  busNumber: z.string().optional().default('TN-01-EXP-101'),
  driverName: z.string().optional().default('Staff Driver'),
  driverPhone: z.string().optional().default('+91 98765 43210'),
  stops: z.string().optional().default('Main Campus, City Junction'),
  capacity: z.number().or(z.string().transform(v => Number(v) || 40)).optional().default(40),
  studentsCount: z.number().or(z.string().transform(v => Number(v) || 0)).optional().default(25),
  status: z.enum(['On Time', 'Delayed', 'Maintenance', 'Active']).optional().default('On Time'),
});

export const updateTransportRouteSchema = createTransportRouteSchema.partial();
