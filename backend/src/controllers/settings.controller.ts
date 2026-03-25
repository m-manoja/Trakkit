import type { Request, Response } from "express";
import { supabase } from "../config/supabaseClient.js";

interface NotificationSettingsInput {
  email_notification: boolean;
  sms_notification: boolean;
  push_notification: boolean;
  reminder_schedule: string;
}

export async function getNotificationSettings(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching notification settings:', error);
      return res.status(500).json({ error: "Database error" });
    }

    if (!data) {
      // Return default settings if none exist
      return res.json({
        success: true,
        data: {
          email_notification: true,
          sms_notification: false,
          push_notification: true,
          reminder_schedule: '7,3,1'
        }
      });
    }

    return res.json({ success: true, data });
  } catch (err: unknown) {
    console.error('Unexpected error fetching notification settings:', err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateNotificationSettings(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { email_notification, sms_notification, push_notification, reminder_schedule } = req.body as NotificationSettingsInput;

  // Basic validation for reminder_schedule
  if (typeof reminder_schedule !== 'string' || !/^\d+(,\d+)*$/.test(reminder_schedule)) {
     return res.status(400).json({ error: "Invalid reminder schedule format. Use comma separated numbers (e.g., 7,3,1)" });
  }

  try {
    const payload = {
      user_id: userId,
      email_notification: Boolean(email_notification),
      sms_notification: Boolean(sms_notification),
      push_notification: Boolean(push_notification),
      reminder_schedule,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('notification_settings')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('Error updating notification settings:', error);
      return res.status(500).json({ error: "Database error" });
    }

    return res.json({ success: true, data, message: "Settings updated successfully" });
  } catch (err: unknown) {
    console.error('Unexpected error updating notification settings:', err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
