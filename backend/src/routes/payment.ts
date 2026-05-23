import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import * as paymentController from '../controllers/payment.controller.js';

const router = Router();

// Protected: logged-in user starts the payment flow
router.post('/initiate', protect, paymentController.initiatePayment);

// PUBLIC — no JWT. PayHere's servers call this after a payment.
// NEVER add 'protect' middleware here.
router.post('/notify', paymentController.handleNotify);

// Protected: frontend checks if user is premium
router.get('/status', protect, paymentController.getPlanStatus);
router.get('/usage', protect, paymentController.getPremiumUsage);
router.post('/complete', protect, paymentController.completePayment);
router.post('/activate', protect, paymentController.activateCheckout);

export default router;
