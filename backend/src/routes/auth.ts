import { Router, Request, Response } from "express";
import { supabase } from "../config/supabaseClient";

const router = Router();

// ✅ LOGIN / SEND OTP
router.post("/login", async (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: "Phone number required" });

  try {
    const { data, error } = await supabase.auth.signInWithOtp({ phone });
    if (error) return res.status(500).json({ error: error.message });

    // 🚀 TERMINAL LOGGING FOR TESTING
    console.log('\n' + '='.repeat(30));
    console.log(`📱 OTP REQUEST: ${phone}`);
    console.log(`🔑 DEBUG CODE: 123456`);
    console.log('='.repeat(30) + '\n');

    return res.json({ message: "OTP logged to terminal", data });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ VERIFY OTP
router.post("/verify-otp", async (req: Request, res: Response) => {
  const { phone, token } = req.body;
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: "sms",
    });
    if (error) return res.status(401).json({ error: "Invalid OTP" });

    return res.json({ user: data.user, session: data.session });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;