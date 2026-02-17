import type { Request, Response } from "express";
import { requestOtp, verifyOtp as verifyOtpService } from "../services/auth.service.js";
import { supabase } from "../config/supabaseClient.js";
import jwt from 'jsonwebtoken';
import config from '../config.js';

// Helper function to standardize phone numbers
const sanitizePhone = (phone: string): string => {
  // 1. Remove everything except numbers (strips the +)
  let cleaned = phone.replace(/\D/g, '');

  // 2. If it's a 10-digit Sri Lankan number starting with 0, remove it
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // 3. If it has the country code 94, remove that too
  if (cleaned.startsWith('94') && cleaned.length > 9) {
    cleaned = cleaned.substring(2);
  }

  return cleaned; // Always returns the 9-digit '756834823'
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
      .select('id, phone, first_name, last_name, profile_completed')
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