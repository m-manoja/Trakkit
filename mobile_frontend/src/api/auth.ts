// src/api/auth.ts
import { API_BASE_URL } from "./config";

// 1. Updated Type to include navigation data from Backend
type VerifyResponse = {
  user?: { id: string; phone?: string | null };
  userId?: string;
  token?: string;
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

export async function forgotPassword(email: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error || "Failed to send reset email");
  return true;
}

export async function sendEmailVerification(
  token: string,
  email: string,
  mode: "code" | "link" = "code"
) {
  const response = await fetch(`${API_BASE_URL}/api/auth/verify-email/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ email, mode }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error || "Failed to send verification email");
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