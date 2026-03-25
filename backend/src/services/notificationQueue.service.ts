import { supabase } from '../config/supabaseClient';

/**
 * Helper to calculate the next occurrence of a date based on a cycle.
 */
export function getNextOccurrence(startDateStr: string, cycle: string): Date {
  const start = new Date(startDateStr);
  const now = new Date();

  // If start date is in the future, that is the next occurrence.
  if (start > now) return start;

  const next = new Date(start);
  const normalizedCycle = cycle.toLowerCase();
  
  while (next <= now) {
    if (normalizedCycle === 'weekly' || normalizedCycle === 'every week') {
      next.setDate(next.getDate() + 7);
    } else if (normalizedCycle === 'monthly' || normalizedCycle === 'every month') {
      next.setMonth(next.getMonth() + 1);
    } else if (normalizedCycle === 'yearly' || normalizedCycle === 'every year') {
      next.setFullYear(next.getFullYear() + 1);
    } else if (normalizedCycle === 'daily' || normalizedCycle === 'everyday') {
      next.setDate(next.getDate() + 1);
    } else {
      // Default fallback if unknown cycle
      next.setMonth(next.getMonth() + 1);
    }
  }
  return next;
}

/**
 * Calculates reminder dates based on a schedule string like '7,3,1'
 * Filters out days that are too large for the cycle (e.g. 7 days before a weekly cycle).
 */
function calculateReminderDates(targetDate: Date, scheduleStr: string, cycle?: string): Date[] {
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

  const dates: Date[] = [];
  for (const daysBefore of daysArray) {
    const reminderDate = new Date(targetDate);
    reminderDate.setDate(reminderDate.getDate() - daysBefore);
    // Only schedule if it's in the future.
    if (reminderDate > new Date()) {
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
  const nextBillingDate = getNextOccurrence(startDate, billingCycle);
  const reminderDates = calculateReminderDates(nextBillingDate, finalSchedule, billingCycle);
  
  if (nextBillingDate > new Date()) reminderDates.push(nextBillingDate);

  const queueItems = reminderDates.map(date => ({
    user_id: userId,
    reference_id: subscriptionId,
    reference_type: 'subscription',
    title: `Subscription Renewal: ${serviceName}`,
    body: `Your ${billingCycle} subscription for ${serviceName} renews on ${nextBillingDate.toDateString()}.`,
    scheduled_for: date.toISOString(),
  }));

  await insertQueueItems(queueItems);
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
    .map(date => ({
      user_id: userId,
      reference_id: todoId,
      reference_type: 'todo',
      title: `Todo Reminder: ${taskName}`,
      body: `Don't forget to complete: ${taskName}`,
      scheduled_for: date.toISOString(),
    }));

  await insertQueueItems(queueItems);
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

  const queueItems = reminderDates.map(date => ({
    user_id: userId,
    reference_id: warrantyId,
    reference_type: 'warranty',
    title: `Warranty Expiry: ${itemName}`,
    body: `Your warranty for ${itemName} is expiring on ${expiryDate.toDateString()}.`,
    scheduled_for: date.toISOString(),
  }));

  await insertQueueItems(queueItems);
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
    .map(date => ({
      user_id: userId,
      reference_id: reminderId,
      reference_type: 'manual_reminder',
      title: `Reminder: ${title}`,
      body: `You have a reminder scheduled: ${title}`,
      scheduled_for: date.toISOString(),
    }));

  await insertQueueItems(queueItems);
};
