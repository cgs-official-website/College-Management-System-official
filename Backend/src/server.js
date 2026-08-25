import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pino from 'pino';
import { PrismaClient } from '@prisma/client';
import { redis } from './lib/cache.js';
import * as Sentry from '@sentry/node';
import helmet from 'helmet';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// ---------------------------------------------------------
// STARTUP ENVIRONMENT VALIDATION
// ---------------------------------------------------------
const REQUIRED_ENV_VARS = ['DATABASE_URL', 'JWT_SECRET'];
const missingVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  transport: process.env.NODE_ENV === 'production' ? undefined : {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

if (missingVars.length > 0) {
  logger.error(`[fatal] Missing required environment variables: ${missingVars.join(', ')}. Shutting down.`);
  process.exit(1);
}

if (!process.env.REDIS_URL) {
  logger.warn('[warn] REDIS_URL not provided. Defaulting to redis://localhost:6379 (Fail-open mode active).');
}

if (!process.env.SENTRY_DSN) {
  logger.warn('[warn] SENTRY_DSN not provided. Sentry telemetry disabled in this environment.');
}

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

const app = express();

import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Middlewares
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      process.env.FRONTEND_URL,
      // Allow all vercel.app subdomains
    ].filter(Boolean);

    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    // Allow any vercel.app domain or the explicit FRONTEND_URL
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.railway.app')
    ) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(helmet());
app.use(express.json());
app.use(requestLogger);

// ---------------------------------------------------------
// HEALTH CHECK (Railway deployment requirement)
// ---------------------------------------------------------
app.get('/health', async (req, res) => {
  let dbStatus = 'ok';
  let redisStatus = 'ok';

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (e) {
    dbStatus = 'down';
  }

  try {
    await redis.ping();
  } catch (e) {
    redisStatus = 'down';
  }

  const isHealthy = dbStatus === 'ok'; // DB is strictly required, Redis fail-open
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'pass' : 'fail',
    db: dbStatus,
    redis: redisStatus
  });
});

import authRoutes from './modules/auth/auth.routes.js';
import collegesRoutes from './modules/colleges/colleges.routes.js';
import admissionsRoutes from './modules/admissions/admissions.routes.js';
import attendanceRoutes from './modules/attendance/attendance.routes.js';
import feesRoutes from './modules/fees/fees.routes.js';
import dashboardsRoutes from './modules/dashboards/dashboards.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import examsRoutes from './modules/exams/exams.routes.js';
import timetableRoutes from './modules/timetable/timetable.routes.js';
import staffRoutes from './modules/staff/staff.routes.js';
import studentsRoutes from './modules/students/students.routes.js';
import rolesRoutes from './modules/roles/roles.routes.js';
import noticesRoutes from './modules/notices/notices.routes.js';
import libraryRoutes from './modules/library/library.routes.js';
import infrastructureRoutes from './modules/infrastructure/infrastructure.routes.js';
import hostelRoutes from './modules/hostel/hostel.routes.js';
import transportRoutes from './modules/transport/transport.routes.js';
import complaintsRoutes from './modules/complaints/complaints.routes.js';
import placementsRoutes from './modules/placements/placements.routes.js';
import storeRoutes from './modules/store/store.routes.js';
import departmentsRoutes from './modules/departments/departments.routes.js';
import coursesRoutes from './modules/courses/courses.routes.js';
import sectionsRoutes from './modules/sections/sections.routes.js';
import * as stubs from './modules/stubs.js';
import { getModules } from './modules/roles/roles.controller.js';
import { authenticate } from './middleware/authenticate.js';
import { catchAsync } from './lib/catchAsync.js';

// API Routes (Core & Tenant Modules)
app.use('/api/v1/colleges', collegesRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin/admissions', admissionsRoutes);
app.use('/api/v1/students', studentsRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/fees', feesRoutes);
app.use('/api/v1/dashboards', dashboardsRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/roles', rolesRoutes);
app.get('/api/v1/modules', authenticate, catchAsync(getModules));
app.use('/api/v1/exams', examsRoutes);
app.use('/api/v1/timetable', timetableRoutes);
app.use('/api/v1/staff', staffRoutes);
app.use('/api/v1/notices', noticesRoutes);
app.use('/api/v1/library', libraryRoutes);
app.use('/api/v1/infrastructure', infrastructureRoutes);
app.use('/api/v1/hostel', hostelRoutes);
app.use('/api/v1/transport', transportRoutes);
app.use('/api/v1/complaints', complaintsRoutes);
app.use('/api/v1/placements', placementsRoutes);
app.use('/api/v1/store', storeRoutes);
app.use('/api/v1/departments', departmentsRoutes);
app.use('/api/v1/courses', coursesRoutes);
app.use('/api/v1/sections', sectionsRoutes);
import assignmentsRoutes from './modules/assignments/assignments.routes.js';
import payrollRoutes from './modules/payroll/payroll.routes.js';
import projectsRoutes from './modules/projects/projects.routes.js';
import apiIntegrationRoutes from './modules/api_integrations/api_integrations.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import customRoutes from './modules/custom/custom.routes.js';
import builderRoutes from './modules/builder/builder.routes.js';
import dynamicRoutes from './modules/dynamic/dynamic.routes.js';
import emailTemplatesRoutes from './modules/email/emailTemplates.routes.js';
import studentPortalRoutes from './modules/student_portal/studentPortal.routes.js';

app.use('/api/v1/student', studentPortalRoutes);
app.use('/api/v1/public', stubs.publicRoutes);
app.use('/api/v1/mock', stubs.mockDataRoutes);
app.use('/api/v1/assignments', assignmentsRoutes);
app.use('/api/v1/payroll', payrollRoutes);
app.use('/api/v1/projects', projectsRoutes);
app.use('/api/v1/integrations', apiIntegrationRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/custom', customRoutes);
app.use('/api/v1/builder', builderRoutes);
app.use('/api/v1/dynamic', dynamicRoutes);
app.use('/api/v1/email-templates', emailTemplatesRoutes);

// Sentry error handler if initialized
Sentry.setupExpressErrorHandler(app);

// 404 Handler for unmatched routes
app.use(notFoundHandler);

// Centralized Express Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(`[info] Zuna ERP Backend running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('[info] SIGTERM received. Shutting down gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
  });
});
