import type { Request, Response } from "express";
import {
  requestOtp,
  verifyOtp as verifyOtpService,
  requestPasswordReset,
  confirmPasswordReset,
  requestEmailVerification,
  confirmEmailVerification,
} from "../services/auth.service.js";
import { supabase } from "../config/supabaseClient.js";
import jwt from 'jsonwebtoken';
import config from '../config.js';

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

    // Check whether the user has explicitly saved their notification settings
    const { data: notifSettings } = await supabase
      .from('notification_settings')
      .select('user_configured')
      .eq('user_id', userProfile.id)
      .maybeSingle();

    const settingsCompleted = notifSettings?.user_configured === true;

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
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  try {
    await requestEmailVerification(userId, email.trim());
    return res.json({ message: 'Verification email sent' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to send verification email' });
  }
}

export async function verifyEmail(req: Request, res: Response) {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }
  try {
    const { email } = await confirmEmailVerification(token);
    return res.json({ message: 'Email verified successfully', email });
  } catch (err: any) {
    return res.status(err.status || 400).json({ error: err.message });
  }
}