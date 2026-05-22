import { Router } from 'express';
import * as subscriptionController from '../controllers/subscription.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

router.post('/add', protect, subscriptionController.addSubscription);
router.get('/user/:userId', protect, subscriptionController.getUserSubscriptions);
router.get('/:id', protect, subscriptionController.getSubscription);
router.put('/:id', protect, subscriptionController.editSubscription);
router.put('/:id/renew', protect, subscriptionController.renewUserSubscription);
router.delete('/:id', protect, subscriptionController.removeSubscription);

export default router;