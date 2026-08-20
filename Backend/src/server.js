import express from 'express';
import cors from 'cors';
import pino from 'pino';
import { PrismaClient } from '@prisma/client';
import { redis } from './lib/cache.js';
import * as Sentry from '@sentry/node';
import helmet from 'helmet';

// Initialize Sentry early so it can catch setup errors
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 1.0, 
});

export const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });

const app = express();

// The request handler must be the first middleware on the app
Sentry.setupExpressErrorHandler(app);

app.use(cors());
app.use(helmet());
app.use(express.json());

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
import admissionsRoutes from './modules/admissions/admissions.routes.js';
import attendanceRoutes from './modules/attendance/attendance.routes.js';
import feesRoutes from './modules/fees/fees.routes.js';
import dashboardsRoutes from './modules/dashboards/dashboards.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import examsRoutes from './modules/exams/exams.routes.js';
import timetableRoutes from './modules/timetable/timetable.routes.js';
import staffRoutes from './modules/staff/staff.routes.js';
import noticesRoutes from './modules/notices/notices.routes.js';
import libraryRoutes from './modules/library/library.routes.js';
import infrastructureRoutes from './modules/infrastructure/infrastructure.routes.js';
import * as stubs from './modules/stubs.js';

// API Routes (Core 5 Modules)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin/admissions', admissionsRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/fees', feesRoutes);
app.use('/api/v1/dashboards', dashboardsRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/exams', examsRoutes);
app.use('/api/v1/timetable', timetableRoutes);

// API Routes (Milestone 3)
app.use('/api/v1/staff', staffRoutes);
app.use('/api/v1/notices', noticesRoutes);
app.use('/api/v1/library', libraryRoutes);
app.use('/api/v1/infrastructure', infrastructureRoutes);

// Mount Stubs
app.use('/api/v1/hostel', stubs.hostelRoutes);
app.use('/api/v1/transport', stubs.transportRoutes);
app.use('/api/v1/complaints', stubs.complaintsRoutes);
app.use('/api/v1/placements', stubs.placementsRoutes);
app.use('/api/v1/store', stubs.storeRoutes);
app.use('/api/v1/public', stubs.publicRoutes);
app.use('/api/v1/mock', stubs.mockDataRoutes);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(`Zuna Backend running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
  });
});
