import type { Request, Response } from 'express';
import { supabase } from '../config/supabaseClient.js';
import { DEFAULT_TIMEZONE, isValidTimezone, normalizeTimezone } from '../utils/timezone.js';
import { rescheduleAllNotificationsForUser } from '../services/notificationReschedule.service.js';
import { registerPushToken, removePushToken } from '../services/push.service.js';

interface NotificationSettingsInput {
  email_notification: boolean;
  sms_notification: boolean;
  push_notification: boolean;
  reminder_schedule: string;
  timezone?: string;
}

const defaultSettings = {
  email_notification: true,
  sms_notification: false,
  push_notification: true,
  reminder_schedule: '7,3,1',
  timezone: DEFAULT_TIMEZONE,
};

export async function getNotificationSettings(req: Request, res: Response) {
  const userId = (req as any).user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching notification settings:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!data) {
      return res.json({
        success: true,
        data: defaultSettings,
      });
    }

    return res.json({
      success: true,
      data: {
        ...data,
        timezone: normalizeTimezone(data.timezone),
      },
    });
  } catch (err: unknown) {
    console.error('Unexpected error fetching notification settings:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateNotificationSettings(req: Request, res: Response) {
  const userId = (req as any).user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { email_notification, sms_notification, push_notification, reminder_schedule, timezone } =
    req.body as NotificationSettingsInput;

  if (typeof reminder_schedule !== 'string' || !/^\d+(,\d+)*$/.test(reminder_schedule)) {
    return res.status(400).json({ error: 'Invalid reminder schedule format. Use comma separated numbers (e.g., 7,3,1)' });
  }

  if (timezone !== undefined && !isValidTimezone(timezone)) {
    return res.status(400).json({ error: 'Invalid timezone. Use an IANA timezone (e.g. Asia/Colombo).' });
  }

  try {
    const { data: previous } = await supabase
      .from('notification_settings')
      .select('reminder_schedule, timezone')
      .eq('user_id', userId)
      .maybeSingle();

    const payload = {
      user_id: userId,
      email_notification: Boolean(email_notification),
      sms_notification: Boolean(sms_notification),
      push_notification: Boolean(push_notification),
      reminder_schedule,
      timezone: normalizeTimezone(timezone),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('notification_settings')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      console.error('Error updating notification settings:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    const scheduleChanged = previous?.reminder_schedule !== reminder_schedule;
    const timezoneChanged =
      previous != null &&
      normalizeTimezone(previous.timezone) !== normalizeTimezone(timezone);

    if (scheduleChanged || timezoneChanged) {
      rescheduleAllNotificationsForUser(userId).catch((e) =>
        console.error('[Settings] Reschedule after settings change failed:', e)
      );
    }

    return res.json({ success: true, data, message: 'Settings updated successfully' });
  } catch (err: unknown) {
    console.error('Unexpected error updating notification settings:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function savePushToken(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  const { token, platform } = req.body as { token?: string; platform?: string };

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!token || typeof token !== 'string' || !token.startsWith('ExponentPushToken')) {
    return res.status(400).json({ error: 'Invalid Expo push token' });
  }

  try {
    await registerPushToken(userId, token, platform || 'expo');
    return res.json({ success: true, message: 'Push token registered' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save push token';
    return res.status(500).json({ error: message });
  }
}

export async function deletePushToken(req: Request, res: Response) {
  const userId = (req as any).user?.id;
  const { token } = req.body as { token?: string };

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!token) {
    return res.status(400).json({ error: 'Token required' });
  }

  try {
    await removePushToken(userId, token);
    return res.json({ success: true, message: 'Push token removed' });
  } catch (err: unknown) {
    return res.status(500).json({ error: 'Failed to remove push token' });
  }
}
