import { Router } from 'express';
import { 
  login, 
  refreshToken, 
  logout, 
  registerAdmin, 
  getMe, 
  verifyStaffSetup, 
  completeStaffSetup, 
  forgotPassword, 
  resetPassword,
  getStudentRegistrationInfo,
  getStudentLookup,
  studentRegister,
  activateStudentAccount
} from './auth.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = Router();

router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.post('/register', registerAdmin);
router.get('/me', authenticate, getMe);

// Student Registration routes (public)
router.get('/student/register-info', getStudentRegistrationInfo);
router.get('/student/lookup', getStudentLookup);
router.post('/student/register', studentRegister);
router.post('/student/activate', activateStudentAccount);

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Staff Setup routes (public)
router.get('/staff-setup/verify', verifyStaffSetup);
router.post('/staff-setup', completeStaffSetup);

export default router;
