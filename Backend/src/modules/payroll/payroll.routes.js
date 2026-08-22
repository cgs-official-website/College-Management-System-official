import express from 'express';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { authenticate } from '../../middleware/authenticate.js';
import { getPayroll } from './payroll.controller.js';

const router = express.Router();

router.use(authenticate, resolveTenant);

router.get('/', getPayroll);

export default router;
