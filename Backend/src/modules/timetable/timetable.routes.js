import { Router } from 'express';
import { getTimetable, scheduleSlot, updateSlot, deleteSlot, getTodayTimetable } from './timetable.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { catchAsync } from '../../lib/catchAsync.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/', catchAsync(getTimetable));
router.get('/today', catchAsync(getTodayTimetable));
router.post('/schedule', catchAsync(scheduleSlot));
router.put('/:id', catchAsync(updateSlot));
router.delete('/:id', catchAsync(deleteSlot));

export default router;
