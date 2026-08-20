import { Router } from 'express';
import { scheduleSlot } from './timetable.controller.js';
import { authorize } from '../../middleware/authorize.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.post('/schedule', authorize('admin', 'hod'), scheduleSlot);

export default router;
