import { Router } from 'express';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from './notifications.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { resolveTenant } from '../../middleware/resolveTenant.js';
import { catchAsync } from '../../lib/catchAsync.js';

const router = Router();

router.use(authenticate, resolveTenant);

router.get('/unread-count', catchAsync(getUnreadCount));
router.get('/', catchAsync(getNotifications));

// New PATCH endpoints
router.patch('/read-all', catchAsync(markAllAsRead));
router.patch('/:id/read', catchAsync(markAsRead));

// Legacy PUT endpoints preserved for deployed backward compatibility
router.put('/read-all', catchAsync(markAllAsRead));
router.put('/:id/read', catchAsync(markAsRead));

export default router;
