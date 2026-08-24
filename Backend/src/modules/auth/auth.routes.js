import { Router } from 'express';
import { login, refreshToken, logout, registerAdmin, getMe, verifyStaffSetup, completeStaffSetup, forgotPassword, resetPassword } from './auth.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = Router();

router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.post('/register', registerAdmin);
router.get('/me', authenticate, getMe);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Staff Setup routes (public)
router.get('/staff-setup/verify', verifyStaffSetup);
router.post('/staff-setup', completeStaffSetup);

export default router;
