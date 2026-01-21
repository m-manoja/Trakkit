// src/api/auth.ts
import { API_BASE_URL } from "./config";

// 1. Updated Type to include navigation data from Backend
type VerifyResponse = {
  user?: { id: string; phone?: string | null };
  userId?: string;
  nextScreen?: string;
};

export async function sendOTP(phone: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result?.error || "Could not send OTP");
  }

  return true;
}

export async function verifyOTP(phone: string, token: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, token }),
  });

  const result = (await response.json().catch(() => ({}))) as VerifyResponse;

  if (!response.ok) {
    // Use response status text or a default error message
    throw new Error(response.statusText || "Invalid OTP");
  }

  // 2. Return the whole object so the screen gets nextScreen and userId
  return result;
}