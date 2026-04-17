import { Router } from 'express';
import { asyncHandler } from '../middlewares/async.middleware.js';
import { protect } from '../middlewares/auth.middleware.js';
import {
  getNotifications,
  getUnreadCount,
  deleteNotification,
  clearAllNotifications,
} from '../controllers/notifications.controller.js';

const router = Router();

router.get('/', protect, asyncHandler(getNotifications));
router.get('/unread-count', protect, asyncHandler(getUnreadCount));
router.delete('/clear-all', protect, asyncHandler(clearAllNotifications));
router.delete('/:id', protect, asyncHandler(deleteNotification));

export default router;
