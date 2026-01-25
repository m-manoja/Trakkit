import { Router } from 'express';
import * as subscriptionController from '../controllers/subscription.controller';
// Assuming your middleware is named async.middleware.ts or similar
// and you have a protect/auth middleware
import { protect } from '../middlewares/auth.middleware';

const router = Router();

router.post('/add', protect, subscriptionController.addSubscription);

export default router;