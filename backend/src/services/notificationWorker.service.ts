import { supabase } from '../config/supabaseClient.js';

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

export function startNotificationWorker() {
  console.log("Starting notification worker...");
  
  // Run every minute
  setInterval(async () => {
    try {
      const now = new Date().toISOString();

      // Find all pending notifications due now or in the past
      const { data: pendingNotifications, error } = await supabase
        .from('scheduled_notifications')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_for', now);

      if (error) {
        console.error('Error fetching pending notifications for worker:', error);
        return;
      }

      if (!pendingNotifications || pendingNotifications.length === 0) {
        return;
      }

      for (const notification of pendingNotifications) {
        try {
          const { user_id, title, body } = notification;

          // Fetch user's notification settings
          const { data: settings } = await supabase
            .from('notification_settings')
            .select('sms_notification')
            .eq('user_id', user_id)
            .single();

          // If sms_notification is true, send an SMS
          if (settings?.sms_notification) {
            const { data: user } = await supabase
              .from('users')
              .select('phone')
              .eq('id', user_id)
              .single();

            if (user?.phone) {
              const message = `Trakkit Reminder\n${title}\n${body}`;
              await sendSms(user.phone, message);
            }
          }

          // Mark as processed ('notified') so we don't process it again
          await supabase
            .from('scheduled_notifications')
            .update({ status: 'notified' })
            .eq('id', notification.id);

        } catch (err) {
          console.error(`Error processing notification ${notification.id}:`, err);
        }
      }
    } catch (err) {
      console.error('Notification worker error:', err);
    }
  }, 60 * 1000); // Check every 60 seconds
}
