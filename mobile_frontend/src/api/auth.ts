// src/api/auth.ts
import { supabase } from "./supabase";

// Send OTP to phone number
export async function sendOTP(phone: string) {
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) throw error;
  return true;
}

// Verify OTP
export async function verifyOTP(phone: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
  if (error) throw error;
  return data.user;
}
