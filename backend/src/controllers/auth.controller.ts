import type { Request, Response } from "express";
import { requestOtp, verifyOtp as verifyOtpService } from "../services/auth.service.js";
import { supabase } from "../config/supabaseClient.js";
import jwt from 'jsonwebtoken';
import config from '../config.js';

// Helper function to standardize phone numbers
const sanitizePhone = (phone: string): string => {
  // 1. Remove everything except numbers (strips the +)
  let cleaned = phone.replace(/\D/g, '');

  // 2. Handle Sri Lanka (94) specifically to merge 077... and 77... strings
  // Scenario A: Frontend sends +94077... -> 94077... (Length 12 for SL)
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
    const authData = await verifyOtpService(cleanPhone, token);

    // Check user in DB using the standardized number
    const { data: userProfile, error } = await supabase
      .from('users')
      .select('id, phone, first_name, last_name, email, profile_completed, created_at')
      .eq('phone', cleanPhone)
      .single();

    if (error || !userProfile) {
      console.error('User not found or error fetching user:', error);
      return res.status(404).json({ error: "User not found" });
    }

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
        profileCompleted: userProfile.profile_completed
      },
      token: jwtToken, // Send the token to the client
      nextScreen
    });
  } catch (err) {
    console.error('OTP verification error:', err);
    return res.status(500).json({ error: "Verification failed" });
  }
}