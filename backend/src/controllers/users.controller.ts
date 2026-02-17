import type { Request, Response } from "express";
import { updateUserProfile, getUserProfile } from "../services/users.service.js";

export async function updateProfile(req: Request, res: Response) {
  const { userId, firstName, lastName, email, dob } = req.body;

  if (!userId || !firstName || !lastName || !email) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    await updateUserProfile({ userId, firstName, lastName, email, dob });
    return res.json({ message: "Profile updated" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: message });
  }
}

export async function getProfile(req: Request, res: Response) {
  try {
    // Assuming your auth middleware attaches the user to req.user
    const userId = (req as any).user?.id || req.query.userId;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const profile = await getUserProfile(userId);

    // We send back the firstName to show in the "Hello, Name!" header
    return res.json({
      success: true,
      data: profile
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return res.status(500).json({ error: message });
  }
}