import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { authorize } from '../../middleware/authorize.js';
import { catchAsync } from '../../lib/catchAsync.js';
import * as controller from './staffProfile.controller.js';

const router = Router();

router.use(authenticate, resolveTenant);

const employees = authorize('teacher', 'hod', 'faculty', 'staff', 'admin', 'superadmin');

router.get('/', employees, catchAsync(controller.getMyProfile));
router.put('/', employees, catchAsync(controller.updateMyProfile));
router.put('/photo', employees, catchAsync(controller.updateMyPhoto));
router.delete('/photo', employees, catchAsync(controller.removeMyPhoto));
router.put('/password', employees, catchAsync(controller.changeMyPassword));

export default router;
