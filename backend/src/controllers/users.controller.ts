import type { Request, Response } from "express";
import { updateUserProfile, getUserProfile } from "../services/users.service.js";
import { requestOtp, verifyOtp as verifyOtpService, verifyOtpOnly, setBackupPassword, dismissBackupPrompt, loginWithEmail } from "../services/auth.service.js";
import { supabase } from "../config/supabaseClient.js";
import jwt from 'jsonwebtoken';
import config from '../config.js';

// Reuse the same sanitizer as auth controller
const sanitizePhone = (phone: string): string => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('94') && cleaned.length === 12 && cleaned[2] === '0') {
    return '94' + cleaned.substring(3);
  }
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return '94' + cleaned.substring(1);
  }
  if (cleaned.length === 9) {
    return '94' + cleaned;
  }
  return cleaned;
};

export async function updateProfile(req: Request, res: Response) {
  const { userId, firstName, lastName, email, dob } = req.body;

  if (!userId || !firstName || !lastName || !email) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    await updateUserProfile({ userId, firstName, lastName, email, dob });
    return res.json({ message: "Profile updated" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: message });
  }
}

export async function getProfile(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id || req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    const profile = await getUserProfile(userId);
    return res.json({ success: true, data: profile });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: message });
  }
}

// Step 1: Send OTP to new phone number
export async function initiatePhoneChange(req: Request, res: Response) {
  const currentUserId = (req as any).user?.id;
  let { newPhone } = req.body;

  if (!newPhone) {
    return res.status(400).json({ error: "New phone number is required" });
  }

  const cleanNewPhone = sanitizePhone(newPhone);

  try {
    // Check the new number is not already taken by another account
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('phone', cleanNewPhone)
      .single();

    if (existing) {
      return res.status(409).json({ error: "This phone number is already linked to an account" });
    }

    await requestOtp(cleanNewPhone);
    return res.json({ message: "OTP sent to new number" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to send OTP";
    return res.status(500).json({ error: message });
  }
}

// Step 2: Verify OTP, update phone, re-issue token
export async function verifyPhoneChange(req: Request, res: Response) {
  const currentUserId = (req as any).user?.id;
  let { newPhone, otp } = req.body;

  if (!newPhone || !otp) {
    return res.status(400).json({ error: "New phone and OTP are required" });
  }

  const cleanNewPhone = sanitizePhone(newPhone);

  try {
    // Verify the OTP against the new phone number (no DB user lookup needed)
    await verifyOtpOnly(cleanNewPhone, otp);

    // Update phone in users table
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ phone: cleanNewPhone })
      .eq('id', currentUserId)
      .select('id, phone, first_name, last_name, email')
      .single();

    if (updateError || !updatedUser) {
      return res.status(500).json({ error: "Failed to update phone number" });
    }

    // Issue a new JWT with the updated phone
    const newToken = jwt.sign(
      { id: updatedUser.id, phone: updatedUser.phone },
      config.jwt.secret,
      { expiresIn: '30d' }
    );

    return res.json({
      message: "Phone number updated successfully",
      user: {
        id: updatedUser.id,
        phone: updatedUser.phone,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        email: updatedUser.email,
      },
      token: newToken,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Verification failed";
    return res.status(400).json({ error: message });
  }
}

// Upload / change profile image
export async function uploadProfileImage(req: Request, res: Response) {
  const currentUserId = (req as any).user?.id;

  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }
  if (!currentUserId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const ext = req.file.mimetype.split('/')[1] || 'jpg';
    const filePath = `profile-images/${currentUserId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('warranty-documents')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (uploadError) throw new Error(uploadError.message);

    const { data: urlData } = supabase.storage
      .from('warranty-documents')
      .getPublicUrl(filePath);

    const profileImageUrl = urlData.publicUrl;

    const { error: dbError } = await supabase
      .from('users')
      .update({ profile_picture: profileImageUrl })
      .eq('id', currentUserId);

    if (dbError) throw new Error(dbError.message);

    return res.json({ profileImageUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return res.status(500).json({ error: message });
  }
}

// Set backup email + password (called from the in-app nudge)
export async function setBackupPasswordHandler(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    await setBackupPassword(userId, email, password);
    return res.json({ message: 'Backup login set up successfully' });
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

// Dismiss the prompt without setting credentials
export async function dismissBackupPromptHandler(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  try {
    await dismissBackupPrompt(userId);
    return res.json({ message: 'Prompt dismissed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// Email + password login endpoint
export async function emailLogin(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await loginWithEmail(email, password);

    const token = jwt.sign(
      { id: user.id, phone: user.phone },
      config.jwt.secret,
      { expiresIn: '30d' }
    );

    // Check whether the user has explicitly saved their notification settings
    const { data: notifSettings } = await supabase
      .from('notification_settings')
      .select('user_configured')
      .eq('user_id', user.id)
      .maybeSingle();

    const settingsCompleted = notifSettings?.user_configured === true;

    return res.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        backupEmail: user.backup_email,
        backupPromptShown: user.backup_prompt_shown,
        emailVerified: (user as any).email_verified ?? true,
        settingsCompleted,
        plan: user.plan ?? 'free',
        planActivatedAt: user.plan_activated_at ?? null,
      },
      nextScreen: '/(tabs)',
    });
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}
