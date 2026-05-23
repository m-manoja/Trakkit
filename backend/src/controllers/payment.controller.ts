import { Request, Response } from 'express';
import crypto from 'crypto';
import * as paymentService from '../services/payment.service.js';
import { PREMIUM_AMOUNT, PREMIUM_CURRENCY } from '../services/payment.service.js';

const PAYHERE_MERCHANT_ID = process.env.PAYHERE_MERCHANT_ID ?? '';
const PAYHERE_MERCHANT_SECRET = process.env.PAYHERE_MERCHANT_SECRET ?? '';

// ─── POST /api/payment/initiate ───────────────────────────────────────────────
// Frontend calls this to get all the fields needed to submit to PayHere.
// We generate the hash here (in the backend) so the merchant secret is never
// exposed to the browser.
export const initiatePayment = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Check if already premium
    const { plan } = await paymentService.getUserPlan(userId);
    if (plan === 'premium') {
      return res.status(400).json({ success: false, message: 'User is already on the Premium plan.' });
    }

    // Generate a unique order ID for this payment attempt
    const orderId = `TRAKKIT-${userId.slice(0, 8).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
    paymentService.recordPendingOrder(orderId, userId);

    // Generate the PayHere hash
    const hash = paymentService.generatePayHereHash(
      PAYHERE_MERCHANT_ID,
      orderId,
      PREMIUM_AMOUNT,
      PREMIUM_CURRENCY,
      PAYHERE_MERCHANT_SECRET
    );

    return res.status(200).json({
      success: true,
      data: {
        merchant_id: PAYHERE_MERCHANT_ID,
        order_id: orderId,
        amount: PREMIUM_AMOUNT,
        currency: PREMIUM_CURRENCY,
        hash,
        items: 'Trakkit Premium — One-Time Upgrade',
        userId,
        notify_url: process.env.PAYHERE_NOTIFY_URL || `http://localhost:5000/api/payment/notify`,
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/success`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/cancel`,
      },
    });
  } catch (error: any) {
    console.error('initiatePayment error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /api/payment/notify ─────────────────────────────────────────────────
// PayHere calls this endpoint (server-to-server) after a payment completes.
// This is NOT called by the user's browser — it's called by PayHere's servers.
// IMPORTANT: This route must NOT have the JWT auth middleware.
export const handleNotify = async (req: Request, res: Response) => {
  try {
    console.log('📩 PayHere notify received:', req.body);

    const {
      merchant_id,
      order_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
      custom_1, // we'll pass userId as custom_1 from the frontend form
    } = req.body;

    // status_code 2 = Success, 0 = Pending, -1 = Cancelled, -2 = Failed
    if (status_code !== '2') {
      console.warn(`Payment not successful. Status: ${status_code}`);
      return res.status(200).send('OK'); // PayHere expects 200 even on failure
    }

    // Verify the hash to confirm this notification is genuinely from PayHere
    const isValid = paymentService.verifyPayHereNotification(
      merchant_id,
      order_id,
      payhere_amount,
      payhere_currency,
      status_code,
      PAYHERE_MERCHANT_SECRET,
      md5sig
    );

    if (!isValid) {
      console.error('❌ PayHere hash verification FAILED — possible fraud attempt');
      return res.status(400).send('Invalid signature');
    }

    // Hash is valid — upgrade the user's plan in the database
    const userId = custom_1;
    if (!userId) {
      console.error('No userId in custom_1 field');
      return res.status(400).send('Missing userId');
    }

    await paymentService.upgradePlanToPremium(userId);

    console.log(`✅ Plan upgraded for user: ${userId}`);
    return res.status(200).send('OK');
  } catch (error: any) {
    console.error('handleNotify error:', error.message);
    // Always return 200 to PayHere, otherwise they'll retry endlessly
    return res.status(200).send('OK');
  }
};

// ─── GET /api/payment/status ──────────────────────────────────────────────────
// Frontend calls this to check the logged-in user's current plan.
export const getPlanStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const planData = await paymentService.getUserPlan(userId);

    res.set('Cache-Control', 'no-store');
    return res.status(200).json({
      success: true,
      data: planData,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /api/payment/activate ───────────────────────────────────────────────
// PayHere return_url does not include md5sig — use order_id saved before checkout.
export const activateCheckout = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { order_id } = req.body;
    if (!order_id) {
      return res.status(400).json({ success: false, message: 'order_id is required' });
    }

    const result = await paymentService.activateAfterCheckout(userId, order_id);
    const planData = await paymentService.getUserPlan(userId);

    return res.status(200).json({
      success: true,
      data: { ...result, plan: planData.plan, plan_activated_at: planData.plan_activated_at },
    });
  } catch (error: any) {
    console.error('activateCheckout error:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// ─── GET /api/payment/usage ───────────────────────────────────────────────────
export const getPremiumUsage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const usage = await paymentService.getPremiumUsage(userId);
    return res.status(200).json({ success: true, data: usage });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /api/payment/complete ───────────────────────────────────────────────
// PayHere redirects the browser to /payment/success with query params.
// Use this when the server notify webhook has not run yet (common in local dev).
export const completePayment = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const {
      merchant_id,
      order_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
    } = req.body;

    if (!order_id || !status_code || !md5sig) {
      return res.status(400).json({ success: false, message: 'Missing payment confirmation fields' });
    }

    const result = await paymentService.completePaymentFromReturn(
      userId,
      {
        merchant_id: merchant_id || PAYHERE_MERCHANT_ID,
        order_id,
        payhere_amount: payhere_amount || PREMIUM_AMOUNT,
        payhere_currency: payhere_currency || PREMIUM_CURRENCY,
        status_code: String(status_code),
        md5sig,
      },
      PAYHERE_MERCHANT_SECRET
    );

    const planData = await paymentService.getUserPlan(userId);

    return res.status(200).json({
      success: true,
      data: { ...result, plan: planData.plan, plan_activated_at: planData.plan_activated_at },
    });
  } catch (error: any) {
    console.error('completePayment error:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
};
