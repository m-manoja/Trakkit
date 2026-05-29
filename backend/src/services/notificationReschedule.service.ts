import { supabase } from '../config/supabaseClient.js';
import {
  scheduleManualReminder,
  scheduleSubscriptionRemindersForDate,
  scheduleTodoReminder,
  scheduleWarrantyReminders,
  getInitialSubscriptionDueDate,
  getUserTimezone,
  parseLocalDate,
} from './notificationQueue.service.js';
import { syncShareNotificationsForItem, type ShareItemType } from './sharing.service.js';

/**
 * Rebuilds all pending notification queue rows for a user after global settings change.
 */
export async function rescheduleAllNotificationsForUser(userId: string): Promise<void> {
  const tz = await getUserTimezone(userId);

  const [warranties, subscriptions, reminders, todos] = await Promise.all([
    supabase.from('warranties').select('*').eq('userId', userId),
    supabase.from('subscriptions').select('*').eq('userId', userId),
    supabase.from('manual_reminders').select('*').eq('user_id', userId),
    supabase.from('todos').select('*').eq('user_id', userId),
  ]);

  for (const w of warranties.data ?? []) {
    if (w.status === 'Claimed') continue;
    await scheduleWarrantyReminders(
      userId,
      w.id,
      w.product_name,
      w.expiry_date,
      w.reminder_schedule
    );
    await syncShareNotificationsForItem(userId, 'warranty', w.id);
  }

  for (const s of subscriptions.data ?? []) {
    const billingStr = String(s.next_billing_date ?? '');
    const nextDate = s.next_billing_date
      ? parseLocalDate(billingStr.split('T')[0] ?? billingStr)
      : getInitialSubscriptionDueDate(s.start_date, s.billing_cycle, tz);
    await scheduleSubscriptionRemindersForDate(
      userId,
      s.id,
      s.service_name,
      nextDate,
      s.billing_cycle,
      s.reminder_schedule
    );
    await syncShareNotificationsForItem(userId, 'subscription', s.id);
  }

  for (const r of reminders.data ?? []) {
    await scheduleManualReminder(
      userId,
      r.id,
      r.title,
      r.reminder_date,
      r.remind_time,
      r.reminder_schedule,
      r.repeat_cycle,
      r.reminder_time
    );
    await syncShareNotificationsForItem(userId, 'reminder', r.id);
  }

  for (const t of todos.data ?? []) {
    if (t.has_reminder && t.reminder_date && !t.is_completed) {
      await scheduleTodoReminder(
        userId,
        t.id,
        t.task_name,
        t.reminder_date,
        t.reminder_schedule,
        t.reminder_time
      );
      await syncShareNotificationsForItem(userId, 'todo', t.id);
    }
  }
}
