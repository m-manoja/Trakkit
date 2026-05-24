import { API_BASE_URL } from "./config";

// ─── OTP / Phone Auth ──────────────────────────────────────────────────────────

export async function sendOTP(phone: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result?.error || "Could not send OTP");
  }
}

export type VerifyOTPResponse = {
  token: string;
  user: {
    id: string;
    phone: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    profileCompleted?: boolean;
    plan?: string;
    backupPromptShown?: boolean;
  };
  nextScreen: string;
};

export async function verifyOTP(
  phone: string,
  token: string
): Promise<VerifyOTPResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, token }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result?.error || "Invalid OTP");
  }

  return result as VerifyOTPResponse;
}

// ─── Email / Password Auth ─────────────────────────────────────────────────────

export type EmailLoginResponse = {
  token: string;
  user: {
    id: string;
    phone: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    backupEmail?: string;
    backupPromptShown?: boolean;
    plan?: string;
  };
  nextScreen: string;
};

export async function emailLogin(
  email: string,
  password: string
): Promise<EmailLoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/email-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result?.error || "Login failed");
  }

  return result as EmailLoginResponse;
}
