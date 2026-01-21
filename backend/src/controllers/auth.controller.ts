import type { Request, Response } from "express";
import { AuthServiceError, requestOtp, verifyOtp as verifyOtpService } from "../services/auth.service.js";
import { supabase } from "../config/supabaseClient.js"; // Import your DB client

function handleAuthError(res: Response, err: unknown) {
  if (err instanceof AuthServiceError) {
    return res.status(err.status).json({ error: err.message });
  }
  return res.status(500).json({ error: "Internal server error" });
}

export async function login(req: Request, res: Response) {
  const { phone } = req.body;
  if (!phone || typeof phone !== "string") {
    return res.status(400).json({ error: "Phone is required" });
  }

  try {
    await requestOtp(phone);
    return res.json({ message: "OTP sent" });
  } catch (err) {
    return handleAuthError(res, err);
  }
}

export async function verifyOtp(req: Request, res: Response) {
  const { phone, token } = req.body;

  if (!phone || typeof phone !== "string" || !token || typeof token !== "string") {
    return res.status(400).json({ error: "Phone and token are required" });
  }

  try {
    // 1. Verify the OTP through your service
    const authData = await verifyOtpService(phone, token);

    // 2. Query your PostgreSQL 'users' table to check the profile status
    const { data: userProfile, error: dbError } = await supabase
      .from('users')
      .select('id, profile_completed')
      .eq('phone', phone)
      .single();

    if (dbError || !userProfile) {
      return res.status(404).json({ error: "User profile not found in database" });
    }

    // 3. Decide the next screen based on the profile_completed flag
    const nextScreen = userProfile.profile_completed ? "/dashboard" : "/profile_setup";

    // 4. Return the user, the ID, and the instruction for navigation
    return res.json({ 
      user: authData, 
      userId: userProfile.id,
      nextScreen: nextScreen 
    });
    
  } catch (err) {
    return handleAuthError(res, err);
  }
}