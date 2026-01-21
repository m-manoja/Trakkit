import type { Request, Response } from "express";
import { updateUserProfile } from "../services/users.service.js";

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
