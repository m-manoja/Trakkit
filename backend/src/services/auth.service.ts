import { randomUUID } from "crypto";
import { supabase } from "../config/supabaseClient.js";

const OTP_TTL_MS = 5 * 60 * 1000;
const TEXTLK_API_URL = "https://app.text.lk/api/http/sms/send";

type OtpEntry = {
  code: string;
  expiresAt: number;
};

const otpStore = new Map<string, OtpEntry>();

export class AuthServiceError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOtpSms(phone: string, code: string) {
  const apiToken = process.env.TEXTLK_API_TOKEN;
  const senderId = process.env.TEXTLK_SENDER_ID;

  if (!apiToken || !senderId) {
    throw new AuthServiceError("Missing TEXTLK_API_TOKEN or TEXTLK_SENDER_ID", 500);
  }

  const message = `Your Trakkit OTP is ${code}`;
  const recipient = phone.startsWith("+") ? phone.slice(1) : phone;
  const url = new URL(TEXTLK_API_URL);
  url.searchParams.append("recipient", recipient);
  url.searchParams.append("sender_id", senderId);
  url.searchParams.append("message", message);
  url.searchParams.append("api_token", apiToken);

  const response = await fetch(url.toString());
  if (!response.ok) {
    const errText = await response.text();
    throw new AuthServiceError(
      `Text.lk API error: ${response.status} - ${errText}`,
      502
    );
  }

  return response.json().catch(() => ({}));
}

export async function requestOtp(phone: string) {
  const code = generateOtp();
  otpStore.set(phone, { code, expiresAt: Date.now() + OTP_TTL_MS });

  await sendOtpSms(phone, code);
}

export async function verifyOtp(phone: string, token: string) {
  const entry = otpStore.get(phone);
  if (!entry) {
    throw new AuthServiceError("OTP expired or not found", 401);
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(phone);
    throw new AuthServiceError("OTP expired", 401);
  }

  if (entry.code !== token) {
    throw new AuthServiceError("Invalid OTP", 401);
  }

  otpStore.delete(phone);

  // Check if user exists in public.users table
  const { data, error } = await supabase
    .from("users")
    .select("id, phone")
    .eq("phone", phone);

  if (error) {
    throw new AuthServiceError(error.message, 500);
  }

  if (data && data.length > 0) {
    return data[0];
  }

  // For now, create user with randomUUID as fallback
  // TODO: Implement proper auth user sync in the future
  const newUser = { id: randomUUID(), phone };
  const { error: insertError } = await supabase.from("users").insert(newUser);

  if (insertError) {
    throw new AuthServiceError(insertError.message, 500);
  }

  return newUser;
}
