/**
 * Migration 021: reminder_time columns + user_configured flag + backfill notification_settings.
 * Copy and run the SQL below in your Supabase SQL Editor:
 *   https://supabase.com/dashboard/project/<your-project>/sql/new
 */

const SQL = `
-- 1. Add reminder_time to manual_reminders if missing
ALTER TABLE manual_reminders
  ADD COLUMN IF NOT EXISTS reminder_time TEXT NOT NULL DEFAULT '08:00';

-- 2. Add reminder_time to todos if missing
ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS reminder_time TEXT DEFAULT NULL;

-- 3. Add user_configured flag to notification_settings
ALTER TABLE notification_settings
  ADD COLUMN IF NOT EXISTS user_configured BOOLEAN NOT NULL DEFAULT false;

-- 4. Add notification_time (global delivery time for subscriptions and warranties)
ALTER TABLE notification_settings
  ADD COLUMN IF NOT EXISTS notification_time TEXT NOT NULL DEFAULT '08:00';

-- 5. Create default notification_settings for users who don't have one yet
INSERT INTO notification_settings (user_id, email_notification, sms_notification, push_notification, reminder_schedule, notification_time, user_configured)
SELECT u.id, true, false, true, '7,3,1', '08:00', false
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM notification_settings ns WHERE ns.user_id = u.id
);
`;

console.log('Run the following SQL in Supabase SQL Editor:\n');
console.log(SQL);
