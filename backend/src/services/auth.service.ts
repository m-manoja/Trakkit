import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { supabase } from "../config/supabaseClient.js";
import { sendPasswordResetEmail, sendEmailVerificationEmail } from "./email.service.js";

const OTP_TTL_MS = 5 * 60 * 1000;
const TEXTLK_API_URL = "https://app.text.lk/api/http/sms/send";

type OtpEntry = {
  code: string;
  expiresAt: number;
};

const otpStore = new Map<string, OtpEntry>();

export class AuthServiceError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOtpSms(phone: string, code: string) {
  const apiToken = process.env.TEXTLK_API_TOKEN;
  const senderId = process.env.TEXTLK_SENDER_ID;

  if (!apiToken || !senderId) {
    throw new AuthServiceError("Missing TEXTLK_API_TOKEN or TEXTLK_SENDER_ID", 500);
  }

  const message = `Your Trakkit OTP is ${code}`;
  const recipient = phone.startsWith("+") ? phone.slice(1) : phone;
  const url = new URL(TEXTLK_API_URL);
  url.searchParams.append("recipient", recipient);
  url.searchParams.append("sender_id", senderId);
  url.searchParams.append("message", message);
  url.searchParams.append("api_token", apiToken);

  const response = await fetch(url.toString());
  if (!response.ok) {
    const errText = await response.text();
    throw new AuthServiceError(
      `Text.lk API error: ${response.status} - ${errText}`,
      502
    );
  }

  return response.json().catch(() => ({}));
}

export async function requestOtp(phone: string) {
  const code = generateOtp();
  otpStore.set(phone, { code, expiresAt: Date.now() + OTP_TTL_MS });

  try {
    await sendOtpSms(phone, code);
  } catch (err: any) {
    // In development, if SMS provider is unreachable (e.g. DNS failure / no internet),
    // fall back to logging the OTP so the app stays usable.
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`⚠️  SMS delivery failed (${err.message}). Using fallback — OTP for ${phone}: ${code}`);
      return; // allow login to continue
    }
    throw err; // in production, propagate the error
  }
}

export async function verifyOtp(phone: string, token: string) {
  const entry = otpStore.get(phone);
  if (!entry) {
    throw new AuthServiceError("OTP expired or not found", 401);
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(phone);
    throw new AuthServiceError("OTP expired", 401);
  }

  if (entry.code !== token) {
    throw new AuthServiceError("Invalid OTP", 401);
  }

  otpStore.delete(phone);

  // Check if user exists in public.users table
  const { data, error } = await supabase
    .from("users")
    .select("id, phone")
    .eq("phone", phone);

  if (error) {
    throw new AuthServiceError(error.message, 500);
  }

  if (data && data.length > 0) {
    return data[0];
  }

  // For now, create user with randomUUID as fallback
  const newUser = { id: randomUUID(), phone };
  const { error: insertError } = await supabase.from("users").insert(newUser);

  if (insertError) {
    throw new AuthServiceError(insertError.message, 500);
  }

  // Create default notification settings for the new user
  await supabase.from("notification_settings").insert({
    user_id: newUser.id,
    email_notification: true,
    sms_notification: false,
    push_notification: true,
    reminder_schedule: '7,3,1',
    notification_time: '08:00',
    user_configured: false,
  }).then(({ error }) => {
    if (error) console.error('Failed to create default notification settings for new user:', error.message);
  });

  return newUser;
}

/**
 * Verifies an OTP code only — does NOT look up or create any user.
 * Used for phone number change flow where the new number is not a user yet.
 */
export async function verifyOtpOnly(phone: string, token: string): Promise<void> {
  const entry = otpStore.get(phone);
  if (!entry) {
    throw new AuthServiceError("OTP expired or not found", 401);
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(phone);
    throw new AuthServiceError("OTP expired", 401);
  }

  if (entry.code !== token) {
    throw new AuthServiceError("Invalid OTP", 401);
  }

  otpStore.delete(phone);
}

// ─── EMAIL + PASSWORD BACKUP LOGIN ───────────────────────────────────────────

/**
 * Set (or update) a backup email + password for a user.
 * Also marks backup_prompt_shown = true so the nudge won't show again.
 */
export async function setBackupPassword(userId: string, email: string, password: string) {
  // Check email not already taken by another user
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('backup_email', email.toLowerCase())
    .neq('id', userId)
    .maybeSingle();

  if (existing) {
    throw new AuthServiceError('This email is already linked to another account', 409);
  }

  const hash = await bcrypt.hash(password, 12);

  const { error } = await supabase
    .from('users')
    .update({
      backup_email: email.toLowerCase(),
      password_hash: hash,
      backup_prompt_shown: true,
    })
    .eq('id', userId);

  if (error) throw new AuthServiceError(error.message, 500);
}

/**
 * Dismiss the backup prompt without setting credentials.
 */
export async function dismissBackupPrompt(userId: string) {
  const { error } = await supabase
    .from('users')
    .update({ backup_prompt_shown: true })
    .eq('id', userId);

  if (error) throw new AuthServiceError(error.message, 500);
}

// ─── PASSWORD RESET ───────────────────────────────────────────────────────────

export async function requestPasswordReset(email: string): Promise<void> {
  const { data: user } = await supabase
    .from('users')
    .select('id, password_hash')
    .eq('backup_email', email.toLowerCase())
    .maybeSingle();

  if (!user || !user.password_hash) {
    throw new AuthServiceError(
      'This email is not registered as a backup email. Please use the email you set up for account recovery.',
      404
    );
  }

  const secret = process.env.JWT_SECRET || 'your-secret-key';
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const token = jwt.sign(
    { userId: user.id, type: 'password-reset', fp: (user.password_hash as string).slice(-8) },
    secret,
    { expiresIn: '1h' }
  );

  await sendPasswordResetEmail(email, `${appUrl}/reset-password?token=${token}`);
}

export async function confirmPasswordReset(token: string, newPassword: string): Promise<void> {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  let payload: any;
  try {
    payload = jwt.verify(token, secret);
  } catch {
    throw new AuthServiceError('Reset link is invalid or expired', 400);
  }

  if (payload.type !== 'password-reset') {
    throw new AuthServiceError('Invalid token', 400);
  }

  if (newPassword.length < 8) {
    throw new AuthServiceError('Password must be at least 8 characters', 400);
  }

  const { data: user } = await supabase
    .from('users')
    .select('id, password_hash')
    .eq('id', payload.userId)
    .maybeSingle();

  if (!user || !user.password_hash) {
    throw new AuthServiceError('User not found', 404);
  }

  if ((user.password_hash as string).slice(-8) !== payload.fp) {
    throw new AuthServiceError('Reset link has already been used', 400);
  }

  const hash = await bcrypt.hash(newPassword, 12);
  const { error } = await supabase.from('users').update({ password_hash: hash }).eq('id', user.id);
  if (error) throw new AuthServiceError(error.message, 500);
}

// ─── EMAIL VERIFICATION ───────────────────────────────────────────────────────

export async function requestEmailVerification(userId: string, email: string): Promise<void> {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const token = jwt.sign(
    { userId, email, type: 'email-verify' },
    secret,
    { expiresIn: '24h' }
  );

  await sendEmailVerificationEmail(email, `${appUrl}/verify-email?token=${token}`);
}

export async function confirmEmailVerification(token: string): Promise<{ email: string }> {
  const secret = process.env.JWT_SECRET || 'your-secret-key';
  let payload: any;
  try {
    payload = jwt.verify(token, secret);
  } catch {
    throw new AuthServiceError('Verification link is invalid or expired', 400);
  }

  if (payload.type !== 'email-verify') {
    throw new AuthServiceError('Invalid token', 400);
  }

  await supabase
    .from('users')
    .update({ email_verified: true })
    .eq('id', payload.userId);

  return { email: payload.email };
}

/**
 * Log in using backup email + password.
 * Returns the full user row on success.
 */
export async function loginWithEmail(email: string, password: string) {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, phone, first_name, last_name, email, backup_email, password_hash, backup_prompt_shown, email_verified, plan, plan_activated_at')
    .eq('backup_email', email.toLowerCase())
    .maybeSingle();

  if (error) throw new AuthServiceError(error.message, 500);
  if (!user || !user.password_hash) {
    throw new AuthServiceError('No account found with that email, or backup login not set up', 401);
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    throw new AuthServiceError('Incorrect password', 401);
  }

  return user;
}
