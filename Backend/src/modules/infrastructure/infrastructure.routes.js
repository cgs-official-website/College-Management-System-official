import { Router } from 'express';
import {
  getAssets, createAsset, updateAsset, deleteAsset,  getBookingRequests, createBookingRequest, reviewBookingRequest } from './infrastructure.controller.js';
import { authorize } from '../../middleware/authorize.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import requirePermission from '../../middleware/requirePermission.js';

const router = Router();

router.use(authenticate, resolveTenant);

const canUse = (action) => (req, res, next) => {
  if (req.user?.role === 'hod' && !req.user.customRoleId) return next();
  return requirePermission('infrastructure', action)(req, res, next);
};

router.get('/', canUse('read'), getAssets);
router.post('/', authorize('admin'), createAsset);
router.put('/:id', authorize('admin'), updateAsset);
router.delete('/:id', authorize('admin'), deleteAsset);

router.get('/requests', canUse('read'), getBookingRequests);
router.post('/requests', canUse('create'), createBookingRequest);
router.put('/requests/:id/review', authorize('admin'), reviewBookingRequest);

export default router;