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
    emailVerified?: boolean;
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
    emailVerified?: boolean;
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

export async function forgotPassword(email: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error || "Failed to send reset email");
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error || "Failed to reset password");
}

export async function sendEmailVerification(token: string, email: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/verify-email/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ email }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error || "Failed to send verification email");
}

export async function confirmEmailVerification(token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/verify-email/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error || "Verification failed");
}
