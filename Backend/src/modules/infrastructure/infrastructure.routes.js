import { Router } from 'express';
import { 
  getAssets, 
  createAsset, 
  updateAsset, 
  deleteAsset,
  getBookingRequests,
  createBookingRequest,
  reviewBookingRequest
} from './infrastructure.controller.js';
import { authorize } from '../../middleware/authorize.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';

const router = Router();

router.use(authenticate, resolveTenant);

// 1. Assets (All authenticated members can view, admin manages)
router.get('/', getAssets);
router.post('/', authorize('admin'), createAsset);
router.put('/:id', authorize('admin'), updateAsset);
router.delete('/:id', authorize('admin'), deleteAsset);

// 2. Booking Requests (HOD / Teachers can request, Admin reviews)
router.get('/requests', getBookingRequests);
router.post('/requests', createBookingRequest);
router.put('/requests/:id/review', authorize('admin'), reviewBookingRequest);

export default router;
