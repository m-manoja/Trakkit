import { supabase } from '../config/supabaseClient.js';
import {
  DEFAULT_TIMEZONE,
  dateToYmdInTz,
  normalizeTimezone,
  todayYmdInTz,
  zonedDateTimeToUtc,
} from '../utils/timezone.js';

export { DEFAULT_TIMEZONE };

/**
 * Parses a YYYY-MM-DD string as LOCAL midnight (not UTC midnight).
 * Using new Date('YYYY-MM-DD') parses as UTC, which in UTC+5:30 shifts the
 * date back by 5.5 hours — causing toISOString() to show the previous day.
 */
export function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('T')[0]?.split('-') ?? [];
  const year = Number(parts[0] ?? 0);
  const month = Number(parts[1] ?? 1);
  const day = Number(parts[2] ?? 1);
  return new Date(year, month - 1, day);
}

export async function getUserTimezone(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('notification_settings')
    .select('timezone')
    .eq('user_id', userId)
    .single();
  if (error) return DEFAULT_TIMEZONE;
  return normalizeTimezone(data?.timezone);
}

export function getInitialSubscriptionDueDate(
  startDateStr: string,
  cycle: string,
  timezone: string = DEFAULT_TIMEZONE
): Date {
  let next = advanceOneCycle(parseLocalDate(startDateStr), cycle);
  const todayYmd = todayYmdInTz(timezone);

  while (dateToYmdInTz(next, timezone) < todayYmd) {
    next = advanceOneCycle(next, cycle);
  }
  return next;
}

export function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getNextOccurrence(
  startDateStr: string,
  cycle: string,
  timezone: string = DEFAULT_TIMEZONE
): Date {
  const next = parseLocalDate(startDateStr.split('T')[0] ?? startDateStr);
  const normalizedCycle = cycle.toLowerCase();
  const todayYmd = todayYmdInTz(timezone);

  while (dateToYmdInTz(next, timezone) < todayYmd) {
    if (normalizedCycle === 'weekly' || normalizedCycle === 'every week') {
      next.setDate(next.getDate() + 7);
    } else if (normalizedCycle === 'monthly' || normalizedCycle === 'every month') {
      next.setMonth(next.getMonth() + 1);
    } else if (normalizedCycle === 'yearly' || normalizedCycle === 'every year') {
      next.setFullYear(next.getFullYear() + 1);
    } else if (normalizedCycle === 'daily' || normalizedCycle === 'everyday') {
      next.setDate(next.getDate() + 1);
    } else {
      next.setMonth(next.getMonth() + 1);
    }
  }
  return next;
}

export function advanceOneCycle(date: Date, cycle: string): Date {
  const next = new Date(date);
  const normalizedCycle = cycle.toLowerCase();
  if (normalizedCycle === 'weekly' || normalizedCycle === 'every week') {
    next.setDate(next.getDate() + 7);
  } else if (normalizedCycle === 'monthly' || normalizedCycle === 'every month') {
    next.setMonth(next.getMonth() + 1);
  } else if (normalizedCycle === 'yearly' || normalizedCycle === 'every year') {
    next.setFullYear(next.getFullYear() + 1);
  } else if (normalizedCycle === 'daily' || normalizedCycle === 'everyday') {
    next.setDate(next.getDate() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}

export function calculateReminderDates(
  targetDate: Date,
  scheduleStr: string,
  cycle?: string,
  timezone: string = DEFAULT_TIMEZONE
): Date[] {
  if (!scheduleStr) return [];

  let daysArray = scheduleStr.split(',').map((d) => parseInt(d.trim(), 10)).filter((d) => !isNaN(d));

  const normalizedCycle = cycle?.toLowerCase();
  if (normalizedCycle === 'weekly' || normalizedCycle === 'every week') {
    daysArray = daysArray.filter((d) => d < 7);
  } else if (normalizedCycle === 'monthly' || normalizedCycle === 'every month') {
    daysArray = daysArray.filter((d) => d < 28);
  }

  const todayYmd = todayYmdInTz(timezone);
  const dates: Date[] = [];

  for (const daysBefore of daysArray) {
    const reminderDate = new Date(targetDate);
    reminderDate.setDate(reminderDate.getDate() - daysBefore);
    if (dateToYmdInTz(reminderDate, timezone) >= todayYmd) {
      dates.push(reminderDate);
    }
  }

  return dates;
}

/**
 * Returns the ISO string for scheduled_for.
 * reminderTime is "HH:MM" in the user's timezone. Defaults to "08:00".
 */
export function toScheduledFor(
  date: Date,
  reminderTime: string = '08:00',
  timezone: string = DEFAULT_TIMEZONE
): string {
  const dateStr = toLocalDateStr(date);
  const schedDate = zonedDateTimeToUtc(dateStr, reminderTime, timezone);
  if (schedDate <= new Date()) return new Date().toISOString();
  return schedDate.toISOString();
}

async function insertQueueItems(items: Array<{ user_id: string; reference_id: string } & Record<string, unknown>>) {
  if (items.length === 0) return;

  const first = items[0];
  if (!first) return;
  const refId = first.reference_id;
  const userId = first.user_id;

  await supabase
    .from('scheduled_notifications')
    .delete()
    .eq('reference_id', refId)
    .eq('user_id', userId)
    .eq('status', 'pending');

  const { error } = await supabase.from('scheduled_notifications').insert(items);

  if (error) {
    console.error('Error inserting scheduled notifications:', error);
  }
}

export const getGlobalReminderSchedule = async (userId: string): Promise<string> => {
  const { data } = await supabase
    .from('notification_settings')
    .select('reminder_schedule')
    .eq('user_id', userId)
    .single();
  return data?.reminder_schedule || '7,3,1';
};

export const scheduleSubscriptionReminders = async (
  userId: string,
  subscriptionId: string,
  serviceName: string,
  startDate: string,
  billingCycle: string,
  reminderSchedule?: string
) => {
  const tz = await getUserTimezone(userId);
  const finalSchedule = reminderSchedule || (await getGlobalReminderSchedule(userId));
  const nextBillingDate = getInitialSubscriptionDueDate(startDate, billingCycle, tz);
  const reminderDates = calculateReminderDates(nextBillingDate, finalSchedule, billingCycle, tz);

  if (dateToYmdInTz(nextBillingDate, tz) > todayYmdInTz(tz)) {
    reminderDates.push(nextBillingDate);
  }

  const queueItems = reminderDates.map((date) => ({
    user_id: userId,
    reference_id: subscriptionId,
    reference_type: 'subscription',
    title: `Subscription Renewal: ${serviceName}`,
    body: `Your ${billingCycle} subscription for ${serviceName} renews on ${nextBillingDate.toDateString()}.`,
    scheduled_for: toScheduledFor(date, '08:00', tz),
  }));

  await insertQueueItems(queueItems);
  await notifyShareRecipients(userId, 'subscription', subscriptionId);
};

export const scheduleSubscriptionRemindersForDate = async (
  userId: string,
  subscriptionId: string,
  serviceName: string,
  nextBillingDate: Date,
  billingCycle: string,
  reminderSchedule?: string
) => {
  const tz = await getUserTimezone(userId);
  const finalSchedule = reminderSchedule || (await getGlobalReminderSchedule(userId));
  const reminderDates = calculateReminderDates(nextBillingDate, finalSchedule, billingCycle, tz);

  if (dateToYmdInTz(nextBillingDate, tz) >= todayYmdInTz(tz)) {
    reminderDates.push(nextBillingDate);
  }

  const queueItems = reminderDates.map((date) => ({
    user_id: userId,
    reference_id: subscriptionId,
    reference_type: 'subscription',
    title: `Subscription Renewal: ${serviceName}`,
    body: `Your ${billingCycle} subscription for ${serviceName} renews on ${nextBillingDate.toDateString()}.`,
    scheduled_for: toScheduledFor(date, '08:00', tz),
  }));

  await insertQueueItems(queueItems);
  await notifyShareRecipients(userId, 'subscription', subscriptionId);
};

export const scheduleTodoReminder = async (
  userId: string,
  todoId: string,
  taskName: string,
  reminderDateStr: string,
  reminderSchedule?: string,
  reminderTime?: string
) => {
  const tz = await getUserTimezone(userId);
  const exactDate = parseLocalDate(reminderDateStr.split('T')[0] ?? reminderDateStr);
  const time = reminderTime || '08:00';

  const finalSchedule = reminderSchedule || (await getGlobalReminderSchedule(userId));
  const beforeDates = calculateReminderDates(exactDate, finalSchedule, undefined, tz);
  const dates = [...beforeDates, exactDate];

  const queueItems = dates.map((date) => ({
    user_id: userId,
    reference_id: todoId,
    reference_type: 'todo',
    title: `Todo Reminder: ${taskName}`,
    body: `Don't forget to complete: ${taskName}`,
    scheduled_for: toScheduledFor(date, time, tz),
  }));

  await insertQueueItems(queueItems);
  await notifyShareRecipients(userId, 'todo', todoId);
};

export const scheduleWarrantyReminders = async (
  userId: string,
  warrantyId: string,
  itemName: string,
  expiryDateStr: string,
  reminderSchedule?: string
) => {
  const tz = await getUserTimezone(userId);
  const finalSchedule = reminderSchedule || (await getGlobalReminderSchedule(userId));
  const expiryDate = parseLocalDate(expiryDateStr.split('T')[0] ?? expiryDateStr);
  const reminderDates = calculateReminderDates(expiryDate, finalSchedule, undefined, tz);

  if (dateToYmdInTz(expiryDate, tz) > todayYmdInTz(tz)) {
    reminderDates.push(expiryDate);
  }

  const queueItems = reminderDates.map((date) => ({
    user_id: userId,
    reference_id: warrantyId,
    reference_type: 'warranty',
    title: `Warranty Expiry: ${itemName}`,
    body: `Your warranty for ${itemName} is expiring on ${expiryDate.toDateString()}.`,
    scheduled_for: toScheduledFor(date, '08:00', tz),
  }));

  await insertQueueItems(queueItems);
  await notifyShareRecipients(userId, 'warranty', warrantyId);
};

export const removeScheduledReminders = async (referenceId: string, userId?: string) => {
  let query = supabase
    .from('scheduled_notifications')
    .delete()
    .eq('reference_id', referenceId)
    .eq('status', 'pending');

  if (userId) {
    query = query.eq('user_id', userId);
  }

  await query;
};

export const scheduleManualReminder = async (
  userId: string,
  reminderId: string,
  title: string,
  reminderDateStr: string,
  remindTime: string,
  reminderSchedule?: string,
  repeatCycle?: string | null,
  reminderTime?: string
) => {
  const tz = await getUserTimezone(userId);
  const time = reminderTime || '08:00';
  const exactDate = repeatCycle
    ? getNextOccurrence(reminderDateStr, repeatCycle, tz)
    : parseLocalDate(reminderDateStr.split('T')[0] ?? reminderDateStr);

  let dates: Date[] = [];

  if (remindTime === 'On the day') {
    dates.push(exactDate);
  } else {
    const finalSchedule = reminderSchedule || (await getGlobalReminderSchedule(userId));
    const beforeDates = calculateReminderDates(exactDate, finalSchedule, repeatCycle || undefined, tz);
    dates.push(...beforeDates);

    if (remindTime === 'On and before') {
      dates.push(exactDate);
    }
  }

  const queueItems = dates.map((date) => ({
    user_id: userId,
    reference_id: reminderId,
    reference_type: 'manual_reminder',
    title: `Reminder: ${title}`,
    body: `You have a reminder scheduled: ${title}`,
    scheduled_for: toScheduledFor(date, time, tz),
  }));

  await insertQueueItems(queueItems);
  await notifyShareRecipients(userId, 'reminder', reminderId);
};

type ShareItemType = 'warranty' | 'subscription' | 'reminder' | 'todo';

async function notifyShareRecipients(ownerUserId: string, itemType: ShareItemType, itemId: string) {
  try {
    const { syncShareNotificationsForItem } = await import('./sharing.service.js');
    await syncShareNotificationsForItem(ownerUserId, itemType, itemId);
  } catch (e) {
    console.error('Failed to sync share notifications:', e);
  }
}
