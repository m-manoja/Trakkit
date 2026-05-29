import { supabase } from '../config/supabaseClient.js';
import { sendEmailNotification } from './email.service.js';

const TEXTLK_API_URL = "https://app.text.lk/api/http/sms/send";

async function sendSms(phone: string, text: string) {
  const apiToken = process.env.TEXTLK_API_TOKEN;
  const senderId = process.env.TEXTLK_SENDER_ID;

  if (!apiToken || !senderId) {
    console.error("Missing TEXTLK_API_TOKEN or TEXTLK_SENDER_ID");
    return;
  }

  const recipient = phone.startsWith("+") ? phone.slice(1) : phone;
  const url = new URL(TEXTLK_API_URL);
  url.searchParams.append("recipient", recipient);
  url.searchParams.append("sender_id", senderId);
  url.searchParams.append("message", text);
  url.searchParams.append("api_token", apiToken);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      const errText = await response.text();
      console.error(`Text.lk API error: ${response.status} - ${errText}`);
    }
  } catch (err) {
    console.error("Error sending SMS:", err);
  }
}

export async function processNotifications() {
  const now = new Date().toISOString();

  const { data: pendingNotifications, error } = await supabase
    .from('scheduled_notifications')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', now);

  if (error) {
    console.error('Error fetching pending notifications for worker:', error);
    return { processed: 0, error: error.message };
  }

  if (!pendingNotifications || pendingNotifications.length === 0) {
    return { processed: 0 };
  }

  let processed = 0;
  for (const notification of pendingNotifications) {
    try {
      const { user_id, title, body } = notification;

      const { data: settings } = await supabase
        .from('notification_settings')
        .select('sms_notification, email_notification')
        .eq('user_id', user_id)
        .single();

      const { data: userData } = await supabase
        .from('users')
        .select('phone, email')
        .eq('id', user_id)
        .single();

      if (settings?.sms_notification && userData?.phone) {
        const message = `Trakkit Reminder\n${title}\n${body}`;
        await sendSms(userData.phone, message);
      }

      console.log(`[Worker] email_notification=${settings?.email_notification}, email=${userData?.email}`);
      if (settings?.email_notification && userData?.email) {
        try {
          console.log(`[Worker] Sending email to ${userData.email}...`);
          await sendEmailNotification(userData.email, title, body);
          console.log(`[Worker] ✅ Email sent successfully to ${userData.email}`);
        } catch (emailErr) {
          console.error(`[Worker] ❌ Email failed for ${userData.email}:`, emailErr);
        }
      } else {
        console.log(`[Worker] Skipping email — email_notification: ${settings?.email_notification}, email: ${userData?.email}`);
      }

      const { error: updateError } = await supabase
        .from('scheduled_notifications')
        .update({ status: 'notified' })
        .eq('id', notification.id);

      if (updateError) {
        console.error(`[Worker] Failed to update status for notification ${notification.id}:`, updateError.message);
      } else {
        processed++;
      }
    } catch (err) {
      console.error(`Error processing notification ${notification.id}:`, err);
    }
  }

  return { processed };
}

export function startNotificationWorker() {
  console.log("Starting notification worker...");
  setInterval(async () => {
    try {
      await processNotifications();
    } catch (err) {
      console.error('Notification worker error:', err);
    }
  }, 60 * 1000);
}
