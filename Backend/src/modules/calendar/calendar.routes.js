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

// Middleware: Calendar module modifications strictly for College Admins (HOD and others have View-Only access)
const adminOnly = async (req, res, next) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId || req.query?.collegeId || req.body?.collegeId;
  const userContext = await resolveUserCalendarContext(req.user, collegeId);

  if (!userContext.canManage) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Calendar modifications are strictly restricted to College Admins. HOD and other roles have View-Only access.'
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

// Write endpoints (strictly restricted to College Admin; HOD is view-only)
router.post('/saturday-rule', adminOnly, catchAsync(configureSaturdayRule));
router.post('/', adminOnly, catchAsync(createCalendarEvent));
router.post('/events', adminOnly, catchAsync(createCalendarEvent));
router.put('/events/:id', adminOnly, catchAsync(updateCalendarEvent));
router.put('/:id', adminOnly, catchAsync(updateCalendarEvent));
router.delete('/events/:id', adminOnly, catchAsync(deleteCalendarEvent));
router.delete('/:id', adminOnly, catchAsync(deleteCalendarEvent));

export default router;
