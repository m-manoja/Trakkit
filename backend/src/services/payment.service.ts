import crypto from 'crypto';
import { supabase } from '../config/supabaseClient.js';
import { countDocumentsByUserId } from './warranty.service.js';

export const FREE_PLAN_DOCUMENT_LIMIT = 10;
export const PREMIUM_AMOUNT = '999.00';
export const PREMIUM_CURRENCY = 'LKR';

/** orderId → userId, set when checkout is initiated */
const pendingOrders = new Map<string, string>();

// ─── PayHere Hash Generation ───────────────────────────────────────────────────
// PayHere requires an MD5 hash to verify the payment request is genuine.
// Formula: MD5(merchant_id + order_id + amount + currency + MD5(merchant_secret))
export function generatePayHereHash(
  merchantId: string,
  orderId: string,
  amount: string,
  currency: string,
  merchantSecret: string
): string {
  const secretHash = crypto
    .createHash('md5')
    .update(merchantSecret)
    .digest('hex')
    .toUpperCase();

  const rawString = `${merchantId}${orderId}${amount}${currency}${secretHash}`;

  return crypto
    .createHash('md5')
    .update(rawString)
    .digest('hex')
    .toUpperCase();
}

// ─── Verify PayHere Webhook Notification ──────────────────────────────────────
// When PayHere calls our /notify endpoint, we must verify the hash they send
// matches what we compute, so we know the notification is genuinely from PayHere.
export function verifyPayHereNotification(
  merchantId: string,
  orderId: string,
  payhereAmount: string,
  payhereCurrency: string,
  statusCode: string,
  merchantSecret: string,
  receivedHash: string
): boolean {
  const secretHash = crypto
    .createHash('md5')
    .update(merchantSecret)
    .digest('hex')
    .toUpperCase();

  const rawString = `${merchantId}${orderId}${payhereAmount}${payhereCurrency}${statusCode}${secretHash}`;

  const computedHash = crypto
    .createHash('md5')
    .update(rawString)
    .digest('hex')
    .toUpperCase();

  return computedHash === receivedHash.toUpperCase();
}

// ─── Upgrade User to Premium ──────────────────────────────────────────────────
// Called after a successful webhook confirmation. Updates the user's plan in DB.
export async function upgradePlanToPremium(userId: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({
      plan: 'premium',
      plan_activated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('Failed to upgrade user plan:', error.message);
    throw new Error(error.message);
  }

  console.log(`✅ User ${userId} upgraded to Premium`);
}

// ─── Get User Plan ────────────────────────────────────────────────────────────
export function recordPendingOrder(orderId: string, userId: string): void {
  pendingOrders.set(orderId, userId);
}

export function getPendingOrderUserId(orderId: string): string | undefined {
  return pendingOrders.get(orderId);
}

export function orderBelongsToUser(orderId: string, userId: string): boolean {
  const prefix = `TRAKKIT-${userId.slice(0, 8).toUpperCase()}-`;
  return orderId.startsWith(prefix);
}

function amountsMatch(received: string, expected: string): boolean {
  const a = parseFloat(received);
  const b = parseFloat(expected);
  if (Number.isNaN(a) || Number.isNaN(b)) return received === expected;
  return Math.abs(a - b) < 0.01;
}

export async function getPremiumUsage(userId: string) {
  const { plan, plan_activated_at } = await getUserPlan(userId);
  const documentCount = await countDocumentsByUserId(userId);

  return {
    plan,
    plan_activated_at,
    document_count: documentCount,
    document_limit: plan === 'premium' ? null : FREE_PLAN_DOCUMENT_LIMIT,
    is_premium: plan === 'premium',
  };
}

/** Browser return URL fallback when PayHere notify webhook is delayed or unreachable. */
export async function completePaymentFromReturn(
  userId: string,
  params: {
    merchant_id: string;
    order_id: string;
    payhere_amount: string;
    payhere_currency: string;
    status_code: string;
    md5sig: string;
  },
  merchantSecret: string
): Promise<{ upgraded: boolean; alreadyPremium: boolean }> {
  const { plan } = await getUserPlan(userId);
  if (plan === 'premium') {
    return { upgraded: false, alreadyPremium: true };
  }

  if (params.status_code !== '2') {
    throw new Error('Payment was not successful');
  }

  const orderOwner = pendingOrders.get(params.order_id);
  const ownedByUser =
    (orderOwner === userId) || orderBelongsToUser(params.order_id, userId);

  if (!ownedByUser) {
    throw new Error('Invalid or unknown order');
  }

  if (
    !amountsMatch(params.payhere_amount, PREMIUM_AMOUNT) ||
    params.payhere_currency !== PREMIUM_CURRENCY
  ) {
    throw new Error('Payment amount mismatch');
  }

  const isValid = verifyPayHereNotification(
    params.merchant_id,
    params.order_id,
    params.payhere_amount,
    params.payhere_currency,
    params.status_code,
    merchantSecret,
    params.md5sig
  );

  if (!isValid) {
    throw new Error('Invalid payment signature');
  }

  await upgradePlanToPremium(userId);
  pendingOrders.delete(params.order_id);

  return { upgraded: true, alreadyPremium: false };
}

/**
 * PayHere redirects to return_url without payment params — only notify has md5sig.
 * After a successful checkout redirect, activate using the order id we stored at initiate.
 */
export async function activateAfterCheckout(
  userId: string,
  orderId: string
): Promise<{ upgraded: boolean; alreadyPremium: boolean }> {
  const { plan } = await getUserPlan(userId);
  if (plan === 'premium') {
    return { upgraded: false, alreadyPremium: true };
  }

  if (!orderBelongsToUser(orderId, userId)) {
    throw new Error('Invalid order for this account');
  }

  const pendingOwner = pendingOrders.get(orderId);
  if (pendingOwner && pendingOwner !== userId) {
    throw new Error('Order does not belong to this user');
  }

  await upgradePlanToPremium(userId);
  pendingOrders.delete(orderId);

  return { upgraded: true, alreadyPremium: false };
}

export async function getUserPlan(userId: string): Promise<{ plan: string; plan_activated_at: string | null }> {
  const { data, error } = await supabase
    .from('users')
    .select('plan, plan_activated_at')
    .eq('id', userId)
    .single();

  if (error) throw new Error(error.message);

  return {
    plan: data?.plan ?? 'free',
    plan_activated_at: data?.plan_activated_at ?? null,
  };
}
