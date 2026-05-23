import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { asyncHandler } from '../middlewares/async.middleware.js';
import * as sharingController from '../controllers/sharing.controller.js';

const router = Router();

router.post('/resolve', protect, asyncHandler(sharingController.resolveRecipient));
router.post('/', protect, asyncHandler(sharingController.createShare));
router.get('/sent', protect, asyncHandler(sharingController.listSent));
router.get('/received', protect, asyncHandler(sharingController.listReceived));
router.get('/received/:shareId', protect, asyncHandler(sharingController.getReceivedDetail));
router.delete('/:shareId', protect, asyncHandler(sharingController.revokeShare));

export default router;
