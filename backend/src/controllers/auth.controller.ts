import type { Request, Response } from "express";
import {
  requestOtp,
  verifyOtp as verifyOtpService,
  requestPasswordReset,
  confirmPasswordReset,
  requestEmailVerification,
  confirmEmailVerification,
  confirmEmailVerificationByLink,
} from "../services/auth.service.js";
import { claimPendingSharesByEmail } from "../services/sharing.service.js";
import { supabase } from "../config/supabaseClient.js";
import jwt from 'jsonwebtoken';
import config from '../config/env.js';

// Helper function to standardize phone numbers
const sanitizePhone = (phone: string): string => {
  // 1. Remove everything except numbers (strips the +)
  let cleaned = phone.replace(/\D/g, '');

  // 2. Handle Sri Lanka (94) specifically to merge 077... and 77... strings
 
  // We want to remove that leading zero after the country code.
  if (cleaned.startsWith('94') && cleaned.length === 12 && cleaned[2] === '0') {
    return '94' + cleaned.substring(3);
  }

  // Scenario B: Generic Local Input (Fallback)
  // 077... -> 9477...
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return '94' + cleaned.substring(1);
  }

  // 77... -> 9477...
  if (cleaned.length === 9) {
    return '94' + cleaned;
  }

  return cleaned;
};

export async function login(req: Request, res: Response) {
  let { phone } = req.body;

  if (!phone || typeof phone !== "string") {
    return res.status(400).json({ error: "Phone is required" });
  }

  // Standardize the number before processing
  const cleanPhone = sanitizePhone(phone);

  try {
    await requestOtp(cleanPhone);
    return res.json({ message: "OTP sent" });
  } catch (err) {
    console.error('Error sending OTP:', err);
    return res.status(500).json({ error: "Failed to send OTP" });
  }
}

export async function verifyOtp(req: Request, res: Response) {
  let { phone, token } = req.body;

  if (!phone || !token) {
    return res.status(400).json({ error: "Phone and token are required" });
  }

  // Standardize the number so it matches the DB record
  const cleanPhone = sanitizePhone(phone);

  try {
    await verifyOtpService(cleanPhone, token);

    // Check user in DB using the standardized number
    const { data: userProfile, error } = await supabase
      .from('users')
      .select('id, phone, first_name, last_name, email, profile_completed, email_verified, created_at, plan, plan_activated_at')
      .eq('phone', cleanPhone)
      .single();

    if (error || !userProfile) {
      console.error('User not found or error fetching user:', error);
      return res.status(404).json({ error: "User not found" });
    }

    // Self-healing: on every login, attach any reminders that were shared to
    // this user's email before they joined (in case an earlier email-linking
    // step missed the claim).
    if (userProfile.email) {
      await claimPendingSharesByEmail(userProfile.id, userProfile.email).catch((e) =>
        console.error('claimPendingShares (login) failed:', e?.message || e)
      );
    }

    // Check whether the user needs first-time settings setup.
    // - No row at all  → brand new user       → settingsCompleted = false
    // - Row exists, user_configured = false   → new user after migration → false
    // - Row exists, user_configured = true    → user saved settings       → true
    // - Row exists, user_configured = undefined (column not yet migrated) → existing user → true
    const { data: notifSettings } = await supabase
      .from('notification_settings')
      .select('user_configured')
      .eq('user_id', userProfile.id)
      .maybeSingle();

    const settingsCompleted = notifSettings != null && notifSettings.user_configured !== false;

    // Generate JWT token
    const jwtToken = jwt.sign(
      {
        id: userProfile.id,
        phone: userProfile.phone
      },
      config.jwt.secret,
      { expiresIn: '30d' } // Token expires in 30 days
    );

    const nextScreen = userProfile.profile_completed ? "/(tabs)" : "/profile_setup";

    return res.json({
      user: {
        id: userProfile.id,
        phone: userProfile.phone,
        firstName: userProfile.first_name,
        lastName: userProfile.last_name,
        email: userProfile.email,
        createdAt: userProfile.created_at,
        profileCompleted: userProfile.profile_completed,
        emailVerified: userProfile.email_verified ?? false,
        settingsCompleted,
        plan: userProfile.plan ?? 'free',
        planActivatedAt: userProfile.plan_activated_at ?? null,
      },
      token: jwtToken, // Send the token to the client
      nextScreen
    });
  } catch (err) {
    console.error('OTP verification error:', err);
    return res.status(500).json({ error: "Verification failed" });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' });
  }
  try {
    await requestPasswordReset(email.trim());
    return res.json({ message: 'Reset link sent! Check your inbox.' });
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message || 'Failed to send reset email' });
  }
}

export async function resetPassword(req: Request, res: Response) {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ error: 'Token and new password are required' });
  }
  try {
    await confirmPasswordReset(token, password);
    return res.json({ message: 'Password updated successfully' });
  } catch (err: any) {
    return res.status(err.status || 400).json({ error: err.message });
  }
}

export async function sendVerifyEmail(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  const { email, mode } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  try {
    await requestEmailVerification(userId, email.trim(), mode === 'link' ? 'link' : 'code');
    return res.json({ message: 'Verification email sent' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to send verification email' });
  }
}

// Renders a minimal branded page for the email-verification-link landing.
function verifyResultPage(opts: { ok: boolean; title: string; message: string; appUrl: string }): string {
  const accent = '#A83B5E';
  const icon = opts.ok
    ? `<polyline points="20 6 9 17 4 12"></polyline>`
    : `<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>`;
  const iconColor = opts.ok ? accent : '#c0392b';
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>${opts.title}</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:48px 16px;"><tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:100%;">
      <tr><td style="background:linear-gradient(135deg,#A83B5E 0%,#c0527a 100%);padding:28px 32px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:0.5px;">Trakkit</h1>
      </td></tr>
      <tr><td style="padding:40px 32px;text-align:center;">
        <div style="width:72px;height:72px;border-radius:50%;background:${iconColor}18;display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>
        </div>
        <h2 style="margin:0 0 12px;color:#1a1a1a;font-size:22px;font-weight:700;">${opts.title}</h2>
        <p style="margin:0 0 28px;color:#555;font-size:15px;line-height:1.6;">${opts.message}</p>
        <a href="${opts.appUrl}" style="display:inline-block;background:linear-gradient(135deg,#A83B5E,#c0527a);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;">Return to Trakkit</a>
      </td></tr>
    </table>
    <p style="margin:20px 0 0;color:#bbbbbb;font-size:11px;">© ${new Date().getFullYear()} Trakkit. All rights reserved.</p>
  </td></tr></table>
</body></html>`;
}

export async function verifyEmailByLink(req: Request, res: Response) {
  const token = req.query.token as string | undefined;
  // Dev links return to the local frontend; prod returns to the deployed app.
  const appUrl = (
    process.env.NODE_ENV === 'production'
      ? process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173'
      : process.env.DEV_FRONTEND_URL || 'http://localhost:5173'
  ).replace(/\/$/, '');

  try {
    if (!token) {
      throw Object.assign(new Error('Token is required'), { status: 400 });
    }
    await confirmEmailVerificationByLink(token);
    return res.status(200).send(verifyResultPage({
      ok: true,
      title: 'Email verified!',
      message: 'Your email address has been confirmed. You can now return to Trakkit and continue to your dashboard.',
      appUrl,
    }));
  } catch (err: any) {
    return res.status(err.status || 400).send(verifyResultPage({
      ok: false,
      title: 'Verification failed',
      message: err.message || 'This verification link is invalid or has expired. Please request a new one from the app.',
      appUrl,
    }));
  }
}

export async function verifyEmail(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { email } = await confirmEmailVerification(userId, token);
    return res.json({ message: 'Email verified successfully', email });
  } catch (err: any) {
    return res.status(err.status || 400).json({ error: err.message });
  }
}