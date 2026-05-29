import { supabase } from '../config/supabaseClient.js';
import { sendEmailNotification } from './email.service.js';
import { sendExpoPushToUser } from './push.service.js';
import {
  advanceOneCycle,
  getNextOccurrence,
  getUserTimezone,
  scheduleManualReminder,
  toLocalDateStr,
} from './notificationQueue.service.js';

const TEXTLK_API_URL = 'https://app.text.lk/api/http/sms/send';
const MAX_DELIVERY_ATTEMPTS = 5;
const STALE_LOCK_MS = 10 * 60 * 1000;

async function sendSms(phone: string, text: string): Promise<boolean> {
  const apiToken = process.env.TEXTLK_API_TOKEN;
  const senderId = process.env.TEXTLK_SENDER_ID;

  if (!apiToken || !senderId) {
    console.error('Missing TEXTLK_API_TOKEN or TEXTLK_SENDER_ID');
    return false;
  }

  const recipient = phone.startsWith('+') ? phone.slice(1) : phone;
  const url = new URL(TEXTLK_API_URL);
  url.searchParams.append('recipient', recipient);
  url.searchParams.append('sender_id', senderId);
  url.searchParams.append('message', text);
  url.searchParams.append('api_token', apiToken);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      const errText = await response.text();
      console.error(`Text.lk API error: ${response.status} - ${errText}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error sending SMS:', err);
    return false;
  }
}

async function releaseStaleLocks() {
  const staleBefore = new Date(Date.now() - STALE_LOCK_MS).toISOString();
  await supabase
    .from('scheduled_notifications')
    .update({ status: 'pending', locked_at: null })
    .eq('status', 'processing')
    .lt('locked_at', staleBefore);
}

async function claimNotification(id: string) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('scheduled_notifications')
    .update({ status: 'processing', locked_at: now })
    .eq('id', id)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle();

  if (error) {
    console.error(`[Worker] Claim failed for ${id}:`, error.message);
    return null;
  }
  return data;
}

async function maybeRescheduleRecurringReminder(notification: {
  reference_type: string;
  reference_id: string;
}) {
  if (notification.reference_type !== 'manual_reminder') return;

  const { data: reminder, error } = await supabase
    .from('manual_reminders')
    .select('*')
    .eq('id', notification.reference_id)
    .single();

  if (error || !reminder?.repeat_cycle) return;

  const { count: pendingCount } = await supabase
    .from('scheduled_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('reference_id', notification.reference_id)
    .eq('reference_type', 'manual_reminder')
    .eq('status', 'pending');

  if ((pendingCount ?? 0) > 0) return;

  const tz = await getUserTimezone(reminder.user_id);
  const exactDate = getNextOccurrence(reminder.reminder_date, reminder.repeat_cycle, tz);
  const nextOccurrence = advanceOneCycle(exactDate, reminder.repeat_cycle);
  const nextDateStr = toLocalDateStr(nextOccurrence);

  await supabase
    .from('manual_reminders')
    .update({ reminder_date: nextOccurrence.toISOString() })
    .eq('id', reminder.id);

  await scheduleManualReminder(
    reminder.user_id,
    reminder.id,
    reminder.title,
    nextDateStr,
    reminder.remind_time,
    reminder.reminder_schedule,
    reminder.repeat_cycle,
    reminder.reminder_time
  );
}

type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  reference_type: string;
  reference_id: string;
  delivery_attempts?: number;
};

async function processOneNotification(notification: NotificationRow): Promise<boolean> {
  const { user_id, title, body, id } = notification;
  const attempts = notification.delivery_attempts ?? 0;

  const { data: settings } = await supabase
    .from('notification_settings')
    .select('sms_notification, email_notification, push_notification')
    .eq('user_id', user_id)
    .single();

  const { data: userData } = await supabase
    .from('users')
    .select('phone, email')
    .eq('id', user_id)
    .single();

  const smsText = `Trakkit Reminder\n${title}\n${body}`;
  const wantsSms = Boolean(settings?.sms_notification && userData?.phone);
  const wantsEmail = Boolean(settings?.email_notification && userData?.email);

  let wantsPush = Boolean(settings?.push_notification);
  if (wantsPush) {
    const { count: pushCount } = await supabase
      .from('push_tokens')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id);
    if (!pushCount) wantsPush = false;
  }

  const hasOutbound = wantsSms || wantsEmail || wantsPush;

  if (!hasOutbound) {
    await supabase
      .from('scheduled_notifications')
      .update({ status: 'notified', locked_at: null })
      .eq('id', id);
    await maybeRescheduleRecurringReminder(notification);
    return true;
  }

  const results: boolean[] = [];

  if (wantsSms && userData?.phone) {
    results.push(await sendSms(userData.phone, smsText));
  }

  if (wantsEmail && userData?.email) {
    try {
      await sendEmailNotification(userData.email, title, body);
      results.push(true);
    } catch (emailErr) {
      console.error(`[Worker] Email failed for ${userData.email}:`, emailErr);
      results.push(false);
    }
  }

  if (wantsPush) {
    results.push(await sendExpoPushToUser(user_id, title, body));
  }

  const anySuccess = results.some(Boolean);

  if (anySuccess) {
    await supabase
      .from('scheduled_notifications')
      .update({ status: 'notified', locked_at: null, delivery_attempts: attempts })
      .eq('id', id);
    await maybeRescheduleRecurringReminder(notification);
    return true;
  }

  const nextAttempts = attempts + 1;
  if (nextAttempts >= MAX_DELIVERY_ATTEMPTS) {
    await supabase
      .from('scheduled_notifications')
      .update({
        status: 'failed',
        locked_at: null,
        delivery_attempts: nextAttempts,
      })
      .eq('id', id);
    console.error(`[Worker] Notification ${id} failed after ${nextAttempts} attempts`);
  } else {
    await supabase
      .from('scheduled_notifications')
      .update({
        status: 'pending',
        locked_at: null,
        delivery_attempts: nextAttempts,
      })
      .eq('id', id);
  }

  return false;
}

export async function processNotifications() {
  await releaseStaleLocks();

  const now = new Date().toISOString();

  const { data: dueIds, error } = await supabase
    .from('scheduled_notifications')
    .select('id')
    .eq('status', 'pending')
    .lte('scheduled_for', now)
    .limit(50);

  if (error) {
    console.error('Error fetching pending notifications for worker:', error);
    return { processed: 0, error: error.message };
  }

  if (!dueIds?.length) {
    return { processed: 0 };
  }

  let processed = 0;
  for (const { id } of dueIds) {
    try {
      const claimed = await claimNotification(id);
      if (!claimed) continue;

      const ok = await processOneNotification(claimed as NotificationRow);
      if (ok) processed++;
    } catch (err) {
      console.error(`Error processing notification ${id}:`, err);
      await supabase
        .from('scheduled_notifications')
        .update({ status: 'pending', locked_at: null })
        .eq('id', id)
        .eq('status', 'processing');
    }
  }

  return { processed };
}

export function startNotificationWorker() {
  console.log('Starting notification worker (60s interval)...');
  setInterval(async () => {
    try {
      await processNotifications();
    } catch (err) {
      console.error('Notification worker error:', err);
    }
  }, 60 * 1000);
}
