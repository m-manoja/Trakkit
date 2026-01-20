// src/api/auth.ts
import { API_BASE_URL } from "./config";

type VerifyResponse = {
  user?: { id: string; phone?: string | null };
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
    throw new Error("Invalid OTP");
  }

  return result.user || null;
}
