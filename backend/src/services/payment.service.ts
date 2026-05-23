import crypto from 'crypto';
import { supabase } from '../config/supabaseClient.js';

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
