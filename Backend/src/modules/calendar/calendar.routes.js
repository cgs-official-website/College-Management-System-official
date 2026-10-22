import { Router } from 'express';
import {
  getCalendarEvents,
  getCalendarEventById,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getCalendarSummary,
  configureSaturdayRule,
  resolveUserCalendarContext
} from './calendar.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { catchAsync } from '../../lib/catchAsync.js';

const router = Router();

// Middleware: Calendar module modifications strictly for College Admins, Principals, and HODs
const adminOrHodOnly = async (req, res, next) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId || req.query?.collegeId || req.body?.collegeId;
  const userContext = await resolveUserCalendarContext(req.user, collegeId);

  if (!userContext.canManage) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Calendar modifications are strictly restricted to College Admins, Principals, and HODs. Regular users have View-Only access.'
    });
  }
  next();
};

// Base middleware: requires authentication and tenant context
router.use(authenticate, resolveTenant);

// Read endpoints (accessible to teachers, students, staff, admins, and HODs)
router.get('/', catchAsync(getCalendarEvents));
router.get('/events', catchAsync(getCalendarEvents));
router.get('/summary', catchAsync(getCalendarSummary));
router.get('/events/:id', catchAsync(getCalendarEventById));
router.get('/:id', catchAsync(getCalendarEventById));

// Write endpoints (strictly restricted to Admin and HOD)
router.post('/saturday-rule', adminOrHodOnly, catchAsync(configureSaturdayRule));
router.post('/', adminOrHodOnly, catchAsync(createCalendarEvent));
router.post('/events', adminOrHodOnly, catchAsync(createCalendarEvent));
router.put('/events/:id', adminOrHodOnly, catchAsync(updateCalendarEvent));
router.put('/:id', adminOrHodOnly, catchAsync(updateCalendarEvent));
router.delete('/events/:id', adminOrHodOnly, catchAsync(deleteCalendarEvent));
router.delete('/:id', adminOrHodOnly, catchAsync(deleteCalendarEvent));

export default router;
