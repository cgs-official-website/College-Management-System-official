import { Router } from 'express';
import {
  getCalendarEvents,
  getCalendarEventById,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getCalendarSummary,
  configureSaturdayRule
} from './calendar.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { catchAsync } from '../../lib/catchAsync.js';

const router = Router();

// Middleware: Calendar module access strictly for College Admins and HODs
const adminOrHodOnly = (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();
  const isAllowed = role === 'admin' || role === 'hod' || role === 'superadmin' || Boolean(req.user?.isHod);
  if (!isAllowed) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Calendar module is only accessible to College Admins and HODs.'
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
