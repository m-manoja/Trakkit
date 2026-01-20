import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import { supabase } from "../config/supabaseClient";

const router = Router();

const OTP_TTL_MS = 5 * 60 * 1000;
const TEXTLK_API_URL = "https://app.text.lk/api/http/sms/send";

type OtpEntry = {
  code: string;
  expiresAt: number;
};

const otpStore = new Map<string, OtpEntry>();

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOtpSms(phone: string, code: string) {
  const apiToken = process.env.TEXTLK_API_TOKEN;
  const senderId = process.env.TEXTLK_SENDER_ID;

  if (!apiToken || !senderId) {
    throw new Error("Missing TEXTLK_API_TOKEN or TEXTLK_SENDER_ID");
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
    throw new Error(`Text.lk API error: ${response.status} - ${errText}`);
  }

  return response.json().catch(() => ({}));
}

router.post("/login", async (req: Request, res: Response) => {
  const { phone } = req.body;

  if (!phone || typeof phone !== "string") {
    return res.status(400).json({ error: "Phone is required" });
  }

  const code = generateOtp();
  otpStore.set(phone, { code, expiresAt: Date.now() + OTP_TTL_MS });

  try {
    await sendOtpSms(phone, code);
    return res.json({ message: "OTP sent" });
  } catch (err: any) {
    console.error("Failed to send OTP", err);
    return res.status(500).json({ error: err?.message || "Failed to send OTP" });
  }
});

router.post("/verify-otp", async (req: Request, res: Response) => {
  const { phone, token } = req.body;

  if (!phone || typeof phone !== "string" || !token || typeof token !== "string") {
    return res.status(400).json({ error: "Phone and token are required" });
  }

  const entry = otpStore.get(phone);
  if (!entry) {
    return res.status(401).json({ error: "OTP expired or not found" });
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(phone);
    return res.status(401).json({ error: "OTP expired" });
  }

  if (entry.code !== token) {
    return res.status(401).json({ error: "Invalid OTP" });
  }

  otpStore.delete(phone);

  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, phone")
      .eq("phone", phone);

    if (error) {
      console.error("Supabase select error", error);
      return res.status(500).json({ error: error.message });
    }

    if (data && data.length > 0) {
      return res.json({ user: data[0] });
    }

    const newUser = { id: randomUUID(), phone };
    const { error: insertError } = await supabase.from("users").insert(newUser);

    if (insertError) {
      console.error("Supabase insert error", insertError);
      return res.status(500).json({ error: insertError.message });
    }

    return res.json({ user: newUser });
  } catch (err) {
    console.error("Verify OTP failed", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
