import { Router, Request, Response } from "express";
import { supabase } from "../config/supabaseClient";

const router = Router();

router.post("/profile", async (req: Request, res: Response) => {
  const { userId, firstName, lastName, email, dob } = req.body;

  if (!userId || !firstName || !lastName || !email) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const { error } = await supabase
      .from("users")
      .update({
        first_name: firstName,
        last_name: lastName,
        email,
        date_of_birth: dob,
        profile_completed: true,
      })
      .eq("id", userId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ message: "Profile updated" });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
