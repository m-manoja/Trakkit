import { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import * as paymentService from '../services/payment.service.js';
import { PREMIUM_AMOUNT, PREMIUM_CURRENCY } from '../services/payment.service.js';
import { supabase } from '../config/supabaseClient.js';
import config from '../config/env.js';

const PAYHERE_MERCHANT_ID = process.env.PAYHERE_MERCHANT_ID ?? '';
const PAYHERE_MERCHANT_SECRET = process.env.PAYHERE_MERCHANT_SECRET ?? '';
const PAYHERE_MERCHANT_SECRET_MOBILE = process.env.PAYHERE_MERCHANT_SECRET_MOBILE ?? PAYHERE_MERCHANT_SECRET;
const PAYHERE_CHECKOUT_URL =
  process.env.PAYHERE_CHECKOUT_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://www.payhere.lk/pay/checkout'
    : 'https://sandbox.payhere.lk/pay/checkout');

// In production we use the public deployed URLs; in local dev we use localhost so
// PayHere's browser redirect comes back to your machine (not the live site).
// NODE_ENV is forced to 'development' by the `dev` npm script and 'production' on Vercel.
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function getBackendLocalUrl(): string {
  const port = process.env.PORT || '5000';
  return `http://localhost:${port}`;
}

/**
 * Backend origin PayHere redirects the browser to (the /web-return endpoint).
 * Prod → public deployed URL; dev → localhost (override with DEV_BACKEND_URL).
 */
function getBackendPublicUrl(): string {
  if (IS_PRODUCTION) {
    return (process.env.BACKEND_PUBLIC_URL || getBackendLocalUrl()).replace(/\/$/, '');
  }
  return (process.env.DEV_BACKEND_URL || getBackendLocalUrl()).replace(/\/$/, '');
}

/**
 * Web SPA base URL the flow lands on after /web-return (the /payment/success page).
 * Must match the origin you browse so sessionStorage (token + order id) survives.
 */
function getWebFrontendBaseUrl(): string {
  if (IS_PRODUCTION) {
    return process.env.FRONTEND_URL || 'https://trakkit.site';
  }
  return process.env.DEV_FRONTEND_URL || 'http://localhost:5173';
}

/**
 * Notify URL (PayHere server-to-server). The WEB flow does NOT depend on this —
 * the success page activates Premium via /activate. Mobile + the secure confirm
 * path do use it. Prod → configured HTTPS URL; dev → localhost (or DEV_NOTIFY_URL tunnel).
 */
function getNotifyUrl(): string {
  if (IS_PRODUCTION) {
    if (process.env.PAYHERE_NOTIFY_URL) return process.env.PAYHERE_NOTIFY_URL;
    const fallback = `${getBackendLocalUrl()}/api/payment/notify`;
    console.warn(
      `[PayHere] PAYHERE_NOTIFY_URL is not set in production. Using ${fallback} — PayHere cannot reach this.`
    );
    return fallback;
  }
  return process.env.DEV_NOTIFY_URL || `${getBackendLocalUrl()}/api/payment/notify`;
}

/** Browser return hits local backend (activates premium), then redirects to the SPA. */
function getPayHereReturnUrls() {
  const webBase = getWebFrontendBaseUrl();
  return {
    return_url: `${getBackendPublicUrl()}/api/payment/web-return`,
    cancel_url: `${webBase}/payment/cancel`,
  };
}

/** HTTPS public URLs for mobile — PayHere rejects WebView + localhost/LAN return URLs. */
function getPayHerePublicBaseUrl(): string {
  const notify = process.env.PAYHERE_NOTIFY_URL;
  if (notify) {
    try {
      return new URL(notify).origin;
    } catch {
      /* fall through */
    }
  }
  const configured = process.env.PAYHERE_PUBLIC_BASE_URL?.replace(/\/$/, '');
  if (configured) return configured;
  throw new Error('Set PAYHERE_NOTIFY_URL (localtunnel) for mobile checkout');
}

function getMobilePayHereReturnUrls() {
  const base = (process.env.PAYHERE_MOBILE_RETURN_BASE?.replace(/\/$/, '')) || getPayHerePublicBaseUrl();
  return {
    return_url: `${base}/api/payment/mobile-return`,
    cancel_url: `${base}/api/payment/mobile-cancel`,
  };
}

function getMobileCheckoutPageBase(): string {
  return (
    process.env.MOBILE_PAYMENT_BASE_URL?.replace(/\/$/, '') || getBackendLocalUrl()
  );
}

function resolveCheckoutUserId(req: Request, orderId: string): string | undefined {
  const queryToken = String(req.query.token || '');
  if (queryToken) {
    return paymentService.validateMobileCheckoutToken(queryToken, orderId);
  }

  const authHeader = req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const raw = authHeader.slice(7);
      const decoded = jwt.verify(raw, config.jwt.secret as string) as {
        id?: string;
        userId?: string;
      };
      return decoded.id || decoded.userId;
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderPayHereCheckoutHtml(fields: Record<string, string>): string {
  const inputs = Object.entries(fields)
    .map(([name, value]) => `<input type="hidden" name="${name}" value="${escapeHtml(value)}" />`)
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PayHere</title></head>
<body>
  <p style="font-family:sans-serif;text-align:center;margin-top:40px;">Redirecting to PayHere…</p>
  <form id="payhere" method="post" action="${PAYHERE_CHECKOUT_URL}">
    ${inputs}
  </form>
  <script>document.getElementById('payhere').submit();</script>
</body>
</html>`;
}

async function buildCheckoutFields(userId: string, orderId: string, forMobile = false) {
  const { return_url, cancel_url } = forMobile ? getMobilePayHereReturnUrls() : getPayHereReturnUrls();
  const isLocalhostReturn = /^https?:\/\/localhost(:\d+)?/.test(return_url);
  const secret = (forMobile && !isLocalhostReturn) ? PAYHERE_MERCHANT_SECRET_MOBILE : PAYHERE_MERCHANT_SECRET;
  const hash = paymentService.generatePayHereHash(
    PAYHERE_MERCHANT_ID,
    orderId,
    PREMIUM_AMOUNT,
    PREMIUM_CURRENCY,
    secret
  );

  const notifyUrl = getNotifyUrl();

  const { data: profile } = await supabase
    .from('users')
    .select('first_name, last_name, email, phone')
    .eq('id', userId)
    .single();

  const firstName = profile?.first_name || 'Trakkit';
  const lastName = profile?.last_name || 'User';
  const email = profile?.email?.includes('@') ? profile.email : 'customer@trakkit.app';
  const phone = (profile?.phone || '0770000000').replace(/\s/g, '');

  return {
    merchant_id: PAYHERE_MERCHANT_ID,
    return_url,
    cancel_url,
    notify_url: notifyUrl,
    order_id: orderId,
    items: 'Trakkit Premium One-Time Upgrade',
    currency: PREMIUM_CURRENCY,
    amount: PREMIUM_AMOUNT,
    hash,
    custom_1: userId,
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    address: 'N/A',
    city: 'Colombo',
    country: 'Sri Lanka',
  };
}

function buildMobileDeepLink(
  path: 'success' | 'cancel',
  query: Record<string, string | undefined>
): string {
  const scheme = process.env.MOBILE_APP_SCHEME || 'mobilefrontend';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return `${scheme}://payment/${path}${qs ? `?${qs}` : ''}`;
}

function sendMobileBridgePage(res: Response, deepLink: string): void {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;text-align:center;padding:2rem;">
  <p>Returning to Trakkit…</p>
  <script>window.location.replace(${JSON.stringify(deepLink)});</script>
</body>
</html>`);
}

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

    const notifyUrl = getNotifyUrl();
    const { return_url, cancel_url } = getPayHereReturnUrls();
    const isMobile = req.body?.platform === 'mobile';

    let checkout_token: string | undefined;
    let checkout_url: string | undefined;
    if (isMobile) {
      checkout_token = paymentService.createMobileCheckoutToken(userId, orderId);
      checkout_url = `${getMobileCheckoutPageBase()}/api/payment/mobile-checkout?order_id=${encodeURIComponent(orderId)}&token=${encodeURIComponent(checkout_token)}`;
    }

    return res.status(200).json({
      success: true,
      data: {
        merchant_id: PAYHERE_MERCHANT_ID,
        order_id: orderId,
        amount: PREMIUM_AMOUNT,
        currency: PREMIUM_CURRENCY,
        hash,
        items: 'Trakkit Premium One-Time Upgrade',
        userId,
        notify_url: notifyUrl,
        return_url,
        cancel_url,
        checkout_token,
        checkout_url,
      },
    });
  } catch (error: any) {
    console.error('initiatePayment error:', error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/payment/mobile-checkout ─────────────────────────────────────────
// Server-rendered PayHere form (same fields as web) — avoids WebView hash/URL issues.
export const serveMobileCheckoutForm = async (req: Request, res: Response) => {
  try {
    const orderId = String(req.query.order_id || '');
    const userId = resolveCheckoutUserId(req, orderId);

    if (!userId) {
      return res.status(401).send('Unauthorized or expired checkout link. Please try again from the app.');
    }

    if (!orderId || !paymentService.orderBelongsToUser(orderId, userId)) {
      return res.status(400).send('Invalid or expired checkout session. Please try again from the app.');
    }

    const fields = await buildCheckoutFields(userId, orderId, true);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(renderPayHereCheckoutHtml(fields));
  } catch (error: any) {
    console.error('serveMobileCheckoutForm error:', error.message);
    return res.status(500).send('Could not start checkout');
  }
};

// ─── GET /api/payment/web-return ──────────────────────────────────────────────
// PayHere redirects the user's browser here with payment query params.
export const webPaymentReturn = async (req: Request, res: Response) => {
  const webBase = getWebFrontendBaseUrl();
  const query = req.query as Record<string, string | undefined>;
  const orderId = query.order_id;
  const statusCode = query.status_code;
  const md5sig = query.md5sig;

  if (orderId && statusCode === '2' && md5sig) {
    const userId = paymentService.getPendingOrderUserId(orderId);
    if (userId) {
      try {
        await paymentService.completePaymentFromReturn(
          userId,
          {
            merchant_id: query.merchant_id || PAYHERE_MERCHANT_ID,
            order_id: orderId,
            payhere_amount: query.payhere_amount || PREMIUM_AMOUNT,
            payhere_currency: query.payhere_currency || PREMIUM_CURRENCY,
            status_code: statusCode,
            md5sig,
          },
          PAYHERE_MERCHANT_SECRET
        );
        console.log(`[PayHere] Premium activated via web-return for order ${orderId}`);
      } catch (e: any) {
        console.warn('[PayHere] web-return activation:', e.message);
      }
    } else {
      console.warn(`[PayHere] web-return: no pending order for ${orderId}`);
    }
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  if (orderId && !params.has('order_id')) params.set('order_id', orderId);

  const qs = params.toString();
  res.redirect(`${webBase}/payment/success${qs ? `?${qs}` : ''}`);
};

// ─── GET /api/payment/mobile-return | mobile-cancel ───────────────────────────
// PayHere redirects here (HTTPS tunnel), then we bridge into the Expo app deep link.
export const mobilePaymentReturn = async (req: Request, res: Response) => {
  const query = req.query as Record<string, string | undefined>;
  const orderId = query.order_id;
  const statusCode = query.status_code;
  const md5sig = query.md5sig;

  if (orderId && statusCode === '2' && md5sig) {
    const userId = paymentService.getPendingOrderUserId(orderId);
    if (userId) {
      try {
        await paymentService.completePaymentFromReturn(
          userId,
          {
            merchant_id: query.merchant_id || PAYHERE_MERCHANT_ID,
            order_id: orderId,
            payhere_amount: query.payhere_amount || PREMIUM_AMOUNT,
            payhere_currency: query.payhere_currency || PREMIUM_CURRENCY,
            status_code: statusCode,
            md5sig,
          },
          PAYHERE_MERCHANT_SECRET_MOBILE
        );
        console.log(`[PayHere] Premium activated via mobile-return for order ${orderId}`);
      } catch (e: any) {
        console.warn('[PayHere] mobile-return activation:', e.message);
      }
    }
  }

  sendMobileBridgePage(res, buildMobileDeepLink('success', query));
};

export const mobilePaymentCancel = (_req: Request, res: Response) => {
  sendMobileBridgePage(res, buildMobileDeepLink('cancel', {}));
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

    // Verify the hash — try both registered secrets (web=localhost, mobile=loca.lt)
    const isValid =
      paymentService.verifyPayHereNotification(merchant_id, order_id, payhere_amount, payhere_currency, status_code, PAYHERE_MERCHANT_SECRET, md5sig) ||
      paymentService.verifyPayHereNotification(merchant_id, order_id, payhere_amount, payhere_currency, status_code, PAYHERE_MERCHANT_SECRET_MOBILE, md5sig);

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

    const params = {
      merchant_id: merchant_id || PAYHERE_MERCHANT_ID,
      order_id,
      payhere_amount: payhere_amount || PREMIUM_AMOUNT,
      payhere_currency: payhere_currency || PREMIUM_CURRENCY,
      status_code: String(status_code),
      md5sig,
    };
    let result;
    try {
      result = await paymentService.completePaymentFromReturn(userId, params, PAYHERE_MERCHANT_SECRET);
    } catch {
      result = await paymentService.completePaymentFromReturn(userId, params, PAYHERE_MERCHANT_SECRET_MOBILE);
    }

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
