import { Router } from 'express';
import { login, registerAdmin, getMe, verifyStaffSetup, completeStaffSetup } from './auth.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = Router();

router.post('/login', login);
router.post('/register', registerAdmin);
router.get('/me', authenticate, getMe);

// Staff Setup routes (public)
router.get('/staff-setup/verify', verifyStaffSetup);
router.post('/staff-setup', completeStaffSetup);

export default router;
