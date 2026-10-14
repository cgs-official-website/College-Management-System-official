import { Router } from 'express';
import { getTimetable, scheduleSlot, updateSlot, deleteSlot, getTodayTimetable } from './timetable.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { catchAsync } from '../../lib/catchAsync.js';

const router = Router();

router.use(authenticate, resolveTenant);

const adminOnly = authorize('admin', 'superadmin');
const staffOnly = authorize('admin', 'superadmin', 'teacher', 'hod', 'faculty');
const timetableReadAccess = authorize('admin', 'superadmin', 'teacher', 'hod', 'faculty', 'student', 'parent');

router.get('/', timetableReadAccess, catchAsync(getTimetable));
router.get('/today', staffOnly, catchAsync(getTodayTimetable));
router.post('/schedule', adminOnly, catchAsync(scheduleSlot));
router.put('/:id', adminOnly, catchAsync(updateSlot));
router.delete('/:id', adminOnly, catchAsync(deleteSlot));

export default router;
