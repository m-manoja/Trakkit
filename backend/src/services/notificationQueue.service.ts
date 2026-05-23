import { supabase } from '../config/supabaseClient';

/**
 * Parses a YYYY-MM-DD string as LOCAL midnight (not UTC midnight).
 * Using new Date('YYYY-MM-DD') parses as UTC, which in UTC+5:30 shifts the
 * date back by 5.5 hours — causing toISOString() to show the previous day.
 */
export function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]); // 1-based
  const day = Number(parts[2]);
  return new Date(year, month - 1, day); // month is 0-indexed, creates LOCAL midnight
}

/**
 * Calculates the FIRST billing date for a subscription, which is always at least one cycle
 * past its creation/start date. Fast-forwards past overdue cycles to the current active cycle.
 */
export function getInitialSubscriptionDueDate(startDateStr: string, cycle: string): Date {
  let next = advanceOneCycle(parseLocalDate(startDateStr), cycle);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // local midnight today

  // If the first real due date is still in the past, fast-forward to the current active cycle
  while (next < today) {
    next = advanceOneCycle(next, cycle);
  }
  return next;
}

/**
 * Formats a Date as YYYY-MM-DD using LOCAL date components.
 * Use this instead of toISOString().split('T')[0] when storing dates to DB.
 */
export function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Helper to calculate the next occurrence of a date based on a cycle.
 */
export function getNextOccurrence(startDateStr: string, cycle: string): Date {
  // Parse as LOCAL midnight to avoid UTC offset shifting the day.
  const next = parseLocalDate(startDateStr);
  const normalizedCycle = cycle.toLowerCase();

  const today = new Date();
  today.setHours(0, 0, 0, 0); // local midnight today

  // Advance until next >= today (billing date today = due today, not advanced)
  while (next < today) {
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

/**
 * Advances a given date by exactly one billing cycle.
 * Used by renewSubscription so the new start_date is always one full period ahead.
 */
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

/**
 * Calculates reminder dates based on a schedule string like '7,3,1'
 * Filters out days that are too large for the cycle (e.g. 7 days before a weekly cycle).
 */
export function calculateReminderDates(targetDate: Date, scheduleStr: string, cycle?: string): Date[] {
  if (!scheduleStr) return [];
  
  let daysArray = scheduleStr.split(',').map(d => parseInt(d.trim(), 10)).filter(d => !isNaN(d));

  const normalizedCycle = cycle?.toLowerCase();
  if (normalizedCycle === 'weekly' || normalizedCycle === 'every week') {
    // For weekly, only allow reminders < 7 days
    daysArray = daysArray.filter(d => d < 7);
  } else if (normalizedCycle === 'monthly' || normalizedCycle === 'every month') {
    // For monthly, only allow reminders < 28 days
    daysArray = daysArray.filter(d => d < 28);
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const dates: Date[] = [];
  for (const daysBefore of daysArray) {
    const reminderDate = new Date(targetDate);
    reminderDate.setDate(reminderDate.getDate() - daysBefore);
    // Include reminders that fall on today or in the future.
    if (reminderDate >= startOfToday) {
      dates.push(reminderDate);
    }
  }

  return dates;
}

/**
 * Schedules reminders in the database queue.
 * Replaces any existing pending reminders for this reference_id first.
 */
async function insertQueueItems(items: any[]) {
  if (items.length === 0) return;

  // Assume all items share the same reference_id
  const refId = items[0].reference_id;
  
  // Clear any existing pending reminders for this item so we don't spam them if they edit it
  await supabase
    .from('scheduled_notifications')
    .delete()
    .eq('reference_id', refId)
    .eq('status', 'pending');

  const { error } = await supabase
    .from('scheduled_notifications')
    .insert(items);

  if (error) {
    console.error('Error inserting scheduled notifications:', error);
  }
}

export const getGlobalReminderSchedule = async (userId: string): Promise<string> => {
  const { data } = await supabase.from('notification_settings').select('reminder_schedule').eq('user_id', userId).single();
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
  const finalSchedule = reminderSchedule || await getGlobalReminderSchedule(userId);
  const nextBillingDate = getInitialSubscriptionDueDate(startDate, billingCycle);
  const reminderDates = calculateReminderDates(nextBillingDate, finalSchedule, billingCycle);
  
  if (nextBillingDate > new Date()) reminderDates.push(nextBillingDate);

  const queueItems = reminderDates.map(date => {
    const schedDate = new Date(date);
    schedDate.setHours(9, 0, 0, 0);
    return {
      user_id: userId,
      reference_id: subscriptionId,
      reference_type: 'subscription',
      title: `Subscription Renewal: ${serviceName}`,
      body: `Your ${billingCycle} subscription for ${serviceName} renews on ${nextBillingDate.toDateString()}.`,
      scheduled_for: schedDate.toISOString(),
    };
  });

  await insertQueueItems(queueItems);
  await notifyShareRecipients(userId, 'subscription', subscriptionId);
};

/**
 * Like scheduleSubscriptionReminders, but accepts a pre-computed nextBillingDate
 * so getNextOccurrence is NOT called again (avoids advancing by an extra cycle).
 * Use this after renewal where the next billing date is already known.
 */
export const scheduleSubscriptionRemindersForDate = async (
  userId: string,
  subscriptionId: string,
  serviceName: string,
  nextBillingDate: Date,
  billingCycle: string,
  reminderSchedule?: string
) => {
  const finalSchedule = reminderSchedule || await getGlobalReminderSchedule(userId);
  const reminderDates = calculateReminderDates(nextBillingDate, finalSchedule, billingCycle);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (nextBillingDate >= startOfToday) reminderDates.push(nextBillingDate);

  const queueItems = reminderDates.map(date => {
    const schedDate = new Date(date);
    schedDate.setHours(9, 0, 0, 0);
    return {
      user_id: userId,
      reference_id: subscriptionId,
      reference_type: 'subscription',
      title: `Subscription Renewal: ${serviceName}`,
      body: `Your ${billingCycle} subscription for ${serviceName} renews on ${nextBillingDate.toDateString()}.`,
      scheduled_for: schedDate.toISOString(),
    };
  });

  await insertQueueItems(queueItems);
  await notifyShareRecipients(userId, 'subscription', subscriptionId);
};

export const scheduleTodoReminder = async (
  userId: string,
  todoId: string,
  taskName: string,
  reminderDateStr: string,
  reminderSchedule?: string
) => {
  const exactDate = new Date(reminderDateStr);

  const finalSchedule = reminderSchedule || await getGlobalReminderSchedule(userId);
  const beforeDates = calculateReminderDates(exactDate, finalSchedule);
  const dates = [...beforeDates, exactDate];

  const queueItems = dates
    .filter(date => date > new Date())
    .map(date => {
      const schedDate = new Date(date);
      schedDate.setHours(9, 0, 0, 0);
      return {
        user_id: userId,
        reference_id: todoId,
        reference_type: 'todo',
        title: `Todo Reminder: ${taskName}`,
        body: `Don't forget to complete: ${taskName}`,
        scheduled_for: schedDate.toISOString(),
      };
    });

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
  const finalSchedule = reminderSchedule || await getGlobalReminderSchedule(userId);
  const expiryDate = new Date(expiryDateStr);
  const reminderDates = calculateReminderDates(expiryDate, finalSchedule);
  
  if (expiryDate > new Date()) reminderDates.push(expiryDate);

  const queueItems = reminderDates.map(date => {
    const schedDate = new Date(date);
    schedDate.setHours(9, 0, 0, 0);
    return {
      user_id: userId,
      reference_id: warrantyId,
      reference_type: 'warranty',
      title: `Warranty Expiry: ${itemName}`,
      body: `Your warranty for ${itemName} is expiring on ${expiryDate.toDateString()}.`,
      scheduled_for: schedDate.toISOString(),
    };
  });

  await insertQueueItems(queueItems);
  await notifyShareRecipients(userId, 'warranty', warrantyId);
};

export const removeScheduledReminders = async (referenceId: string) => {
  await supabase
    .from('scheduled_notifications')
    .delete()
    .eq('reference_id', referenceId)
    .eq('status', 'pending');
};

export const scheduleManualReminder = async (
  userId: string,
  reminderId: string,
  title: string,
  reminderDateStr: string,
  remindTime: string,
  reminderSchedule?: string,
  repeatCycle?: string | null
) => {
  const exactDate = repeatCycle ? getNextOccurrence(reminderDateStr, repeatCycle) : new Date(reminderDateStr);
  let dates: Date[] = [];

  if (remindTime === 'On the day') {
    dates.push(exactDate);
  } else {
    const finalSchedule = reminderSchedule || await getGlobalReminderSchedule(userId);
    const beforeDates = calculateReminderDates(exactDate, finalSchedule, repeatCycle || undefined); // calculates days before
    dates.push(...beforeDates);
    
    if (remindTime === 'On and before') {
      dates.push(exactDate);
    }
  }

  const queueItems = dates
    .filter(date => date > new Date()) // only future dates
    .map(date => {
      const schedDate = new Date(date);
      schedDate.setHours(9, 0, 0, 0);
      return {
        user_id: userId,
        reference_id: reminderId,
        reference_type: 'manual_reminder',
        title: `Reminder: ${title}`,
        body: `You have a reminder scheduled: ${title}`,
        scheduled_for: schedDate.toISOString(),
      };
    });

  await insertQueueItems(queueItems);
  await notifyShareRecipients(userId, 'reminder', reminderId);
};

type ShareItemType = 'warranty' | 'subscription' | 'reminder' | 'todo';

async function notifyShareRecipients(
  ownerUserId: string,
  itemType: ShareItemType,
  itemId: string
) {
  try {
    const { syncShareNotificationsForItem } = await import('./sharing.service.js');
    await syncShareNotificationsForItem(ownerUserId, itemType, itemId);
  } catch (e) {
    console.error('Failed to sync share notifications:', e);
  }
}
