import { Router } from 'express';
import { submitApplication, allotSeat } from './admissions.controller.js';
import { authorize } from '../../middleware/authorize.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.post('/apply', authorize('admin'), submitApplication);
router.post('/allot', authorize('admin'), allotSeat);

export default router;
