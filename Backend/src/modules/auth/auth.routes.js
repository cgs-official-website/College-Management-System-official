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
  activateStudentAccount,
  verifyTeacherRegistration,
  teacherRegister,
  teacherSendSetup,
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

// Staff Setup routes (public) — Step 2: teacher creates password via emailed Setup Link
router.get('/staff-setup/verify', verifyStaffSetup);
router.post('/staff-setup', completeStaffSetup);

// Teacher Registration routes (public) — Step 1: teacher registers with own email via Registration Link
// GET  /auth/teacher-register/verify?token= : validate registration token, return college info
// POST /auth/teacher-register               : teacher submits name+email, system emails Setup Link to teacher
router.get('/teacher-register/verify', verifyTeacherRegistration);
router.post('/teacher-register', teacherRegister);

// Teacher Send Setup — powers the /register/teacher?code= flow
// Teacher provides College ID + Teacher ID → system sends Setup Link to admin-registered email
router.post('/teacher-send-setup', teacherSendSetup);

export default router;
