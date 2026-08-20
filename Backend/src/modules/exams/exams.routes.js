import { Router } from 'express';
import { enterMarks } from './exams.controller.js';
import { authorize } from '../../middleware/authorize.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.post('/marks', authorize('teacher', 'admin'), enterMarks);

export default router;
