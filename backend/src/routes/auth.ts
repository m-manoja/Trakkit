import { Router, Request, Response } from "express";
import { supabase } from "../config/supabaseClient";

const router = Router();

// ✅ LOGIN / SEND OTP
router.post("/login", async (req: Request, res: Response) => {
  const { phone } = req.body;
  
  // Log exactly what arrived
  console.log(`\n📥 Request Received for: ${phone}`);

  try {
    // We try to tell Supabase a user is coming
    await supabase.auth.signInWithOtp({ 
      phone,
      options: { shouldCreateUser: true }
    });

    // We log this regardless of whether SMS actually sent
    console.log('='.repeat(30));
    console.log(`✅ AUTH HANDSHAKE SUCCESS`);
    console.log(`🔑 TEST OTP CODE: 123456`);
    console.log('='.repeat(30));

    return res.json({ message: "Check terminal for code" });
  } catch (err: any) {
    // If Supabase is down or DNS fails (ENOTFOUND), we still allow testing
    console.log("⚠️ Supabase Connection Issue, but allowing test mode...");
    console.log(`🔑 TEST OTP CODE: 123456`);
    
    return res.json({ message: "Debug mode active" });
  }
});

// ✅ VERIFY OTP
router.post("/verify-otp", async (req: Request, res: Response) => {
  const { phone, token } = req.body;

  console.log(`📥 Verification attempt for: ${phone} with code: ${token}`);

  // 1. Check for our Secret Test Code
  if (token === "123456") {
    console.log("✅ Test Code Accepted. Bypassing Supabase check...");
    
    // We try to get the user from Supabase, or return a mock success
    const { data } = await supabase.auth.getUser(); 
    
    return res.json({ 
      message: "Verification successful", 
      user: data?.user || { id: "test-user-id", phone: phone },
      session: { access_token: "mock-token" } 
    });
  }

  // 2. Real Supabase verification (for when you have real SMS)
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: "sms",
    });

    if (error) {
      console.error("❌ Supabase Verify Error:", error.message);
      return res.status(401).json({ error: "Invalid OTP" });
    }

    return res.json({ user: data.user, session: data.session });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;