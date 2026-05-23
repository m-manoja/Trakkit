import { supabase } from '../config/supabaseClient.js';
import { getUserPlan } from './payment.service.js';
import {
  getGlobalReminderSchedule,
  calculateReminderDates,
  getNextOccurrence,
  getInitialSubscriptionDueDate,
  scheduleWarrantyReminders,
  scheduleSubscriptionRemindersForDate,
  scheduleTodoReminder,
  scheduleManualReminder,
} from './notificationQueue.service.js';

export type ShareItemType = 'warranty' | 'subscription' | 'reminder' | 'todo';

const REFERENCE_TYPE_MAP: Record<ShareItemType, string> = {
  warranty: 'warranty',
  subscription: 'subscription',
  reminder: 'manual_reminder',
  todo: 'todo',
};

export type ShareItemInput = { itemType: ShareItemType; itemId: string };

function sanitizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('94') && cleaned.length === 12 && cleaned[2] === '0') {
    return '94' + cleaned.substring(3);
  }
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return '94' + cleaned.substring(1);
  }
  if (cleaned.length === 9) {
    return '94' + cleaned;
  }
  return cleaned;
}

function displayName(user: { first_name?: string | null; last_name?: string | null }): string {
  const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  return name || 'Trakkit user';
}

export async function assertCanCreateShare(ownerUserId: string): Promise<void> {
  const { plan } = await getUserPlan(ownerUserId);
  if (plan !== 'premium') {
    throw new Error('Sharing is available on the Premium plan only.');
  }
}

export async function resolveRecipient(email?: string, phone?: string) {
  const normalizedEmail = email?.trim().toLowerCase();
  const normalizedPhone = phone ? sanitizePhone(phone) : undefined;

  if (!normalizedEmail && !normalizedPhone) {
    throw new Error('Enter an email or phone number.');
  }

  let query = supabase.from('users').select('id, first_name, last_name, email, phone');

  if (normalizedEmail) {
    query = query.eq('email', normalizedEmail);
  } else if (normalizedPhone) {
    query = query.eq('phone', normalizedPhone);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error('No Trakkit account found for this email or phone number.');
  }

  return {
    userId: data.id,
    displayName: displayName(data),
    email: data.email,
    phone: data.phone,
  };
}

async function fetchOwnedItem(ownerUserId: string, itemType: ShareItemType, itemId: string) {
  switch (itemType) {
    case 'warranty': {
      const { data, error } = await supabase
        .from('warranties')
        .select('*')
        .eq('id', itemId)
        .eq('userId', ownerUserId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error('Warranty not found.');
      return data;
    }
    case 'subscription': {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', itemId)
        .eq('userId', ownerUserId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error('Subscription not found.');
      return data;
    }
    case 'reminder': {
      const { data, error } = await supabase
        .from('manual_reminders')
        .select('*')
        .eq('id', itemId)
        .eq('user_id', ownerUserId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error('Reminder not found.');
      return data;
    }
    case 'todo': {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('id', itemId)
        .eq('user_id', ownerUserId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error('To-do not found.');
      return data;
    }
    default:
      throw new Error('Invalid item type.');
  }
}

export async function fetchItemForRecipient(itemType: ShareItemType, itemId: string) {
  switch (itemType) {
    case 'warranty': {
      const { data, error } = await supabase.from('warranties').select('*').eq('id', itemId).maybeSingle();
      if (error || !data) throw new Error('Item not found.');
      return data;
    }
    case 'subscription': {
      const { data, error } = await supabase.from('subscriptions').select('*').eq('id', itemId).maybeSingle();
      if (error || !data) throw new Error('Item not found.');
      return data;
    }
    case 'reminder': {
      const { data, error } = await supabase.from('manual_reminders').select('*').eq('id', itemId).maybeSingle();
      if (error || !data) throw new Error('Item not found.');
      return data;
    }
    case 'todo': {
      const { data, error } = await supabase.from('todos').select('*').eq('id', itemId).maybeSingle();
      if (error || !data) throw new Error('Item not found.');
      return data;
    }
    default:
      throw new Error('Invalid item type.');
  }
}

function itemLabel(itemType: ShareItemType, item: any): string {
  switch (itemType) {
    case 'warranty':
      return item.product_name;
    case 'subscription':
      return item.service_name;
    case 'reminder':
      return item.title;
    case 'todo':
      return item.task_name;
    default:
      return 'Item';
  }
}

async function insertRecipientQueue(
  recipientUserId: string,
  ownerUserId: string,
  referenceId: string,
  referenceType: string,
  queueItems: Array<{
    title: string;
    body: string;
    scheduled_for: string;
  }>
) {
  await supabase
    .from('scheduled_notifications')
    .delete()
    .eq('reference_id', referenceId)
    .eq('user_id', recipientUserId)
    .eq('status', 'pending');

  if (queueItems.length === 0) return;

  const rows = queueItems.map((q) => ({
    user_id: recipientUserId,
    reference_id: referenceId,
    reference_type: referenceType,
    title: q.title,
    body: q.body,
    scheduled_for: q.scheduled_for,
    shared_from_user_id: ownerUserId,
    status: 'pending',
  }));

  const { error } = await supabase.from('scheduled_notifications').insert(rows);
  if (error) console.error('Error inserting shared notifications:', error);
}

async function buildRecipientQueueItems(
  recipientUserId: string,
  ownerUserId: string,
  ownerName: string,
  itemType: ShareItemType,
  item: any
): Promise<Array<{ title: string; body: string; scheduled_for: string }>> {
  const schedule = await getGlobalReminderSchedule(recipientUserId);
  const prefix = `Shared by ${ownerName}`;
  const refType = REFERENCE_TYPE_MAP[itemType];
  const results: Array<{ title: string; body: string; scheduled_for: string }> = [];

  const mapDates = (dates: Date[], title: string, body: string) =>
    dates
      .filter((d) => d > new Date())
      .map((date) => {
        const schedDate = new Date(date);
        schedDate.setHours(9, 0, 0, 0);
        return { title, body, scheduled_for: schedDate.toISOString() };
      });

  switch (itemType) {
    case 'warranty': {
      if (item.status === 'Claimed') return [];
      const expiryDate = new Date(item.expiry_date);
      const dates = calculateReminderDates(expiryDate, schedule);
      if (expiryDate > new Date()) dates.push(expiryDate);
      return mapDates(
        dates,
        `${prefix}: Warranty Expiry — ${item.product_name}`,
        `Warranty for ${item.product_name} expires on ${expiryDate.toDateString()}.`
      );
    }
    case 'subscription': {
      const nextBillingStr =
        item.next_billing_date ||
        getInitialSubscriptionDueDate(item.start_date, item.billing_cycle).toISOString().split('T')[0];
      const nextBillingDate = new Date(nextBillingStr);
      const dates = calculateReminderDates(nextBillingDate, schedule, item.billing_cycle);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      if (nextBillingDate >= startOfToday) dates.push(nextBillingDate);
      return mapDates(
        dates,
        `${prefix}: Subscription — ${item.service_name}`,
        `${item.service_name} (${item.billing_cycle}) renews on ${nextBillingDate.toDateString()}. Amount: ${item.amount}.`
      );
    }
    case 'reminder': {
      const exactDate = item.repeat_cycle
        ? getNextOccurrence(item.reminder_date, item.repeat_cycle)
        : new Date(item.reminder_date);
      let dates: Date[] = [];
      if (item.remind_time === 'On the day') {
        dates.push(exactDate);
      } else {
        const beforeDates = calculateReminderDates(exactDate, schedule, item.repeat_cycle || undefined);
        dates.push(...beforeDates);
        if (item.remind_time === 'On and before') dates.push(exactDate);
      }
      return mapDates(
        dates,
        `${prefix}: Reminder — ${item.title}`,
        item.description
          ? `${item.title}: ${item.description}`
          : `Reminder: ${item.title} on ${exactDate.toDateString()}.`
      );
    }
    case 'todo': {
      if (!item.has_reminder || !item.reminder_date || item.is_completed) return [];
      const exactDate = new Date(item.reminder_date);
      const beforeDates = calculateReminderDates(exactDate, schedule);
      const dates = [...beforeDates, exactDate];
      return mapDates(
        dates,
        `${prefix}: To-do — ${item.task_name}`,
        `To-do reminder: ${item.task_name} on ${exactDate.toDateString()}.`
      );
    }
    default:
      return [];
  }
}

export async function syncShareNotificationsForItem(
  ownerUserId: string,
  itemType: ShareItemType,
  itemId: string
) {
  const { data: shares, error } = await supabase
    .from('item_shares')
    .select('recipient_user_id')
    .eq('owner_user_id', ownerUserId)
    .eq('item_type', itemType)
    .eq('item_id', itemId)
    .is('revoked_at', null);

  if (error || !shares?.length) return;

  const { data: owner } = await supabase
    .from('users')
    .select('first_name, last_name')
    .eq('id', ownerUserId)
    .single();

  const ownerName = displayName(owner || {});
  let item: any;
  try {
    item = await fetchOwnedItem(ownerUserId, itemType, itemId);
  } catch {
    return;
  }

  const refType = REFERENCE_TYPE_MAP[itemType];

  for (const share of shares) {
    const queueItems = await buildRecipientQueueItems(
      share.recipient_user_id,
      ownerUserId,
      ownerName,
      itemType,
      item
    );
    await insertRecipientQueue(share.recipient_user_id, ownerUserId, itemId, refType, queueItems);
  }
}

/** Re-run owner scheduling then fan out to share recipients. */
export async function rescheduleOwnerAndShares(
  ownerUserId: string,
  itemType: ShareItemType,
  itemId: string
) {
  const item = await fetchOwnedItem(ownerUserId, itemType, itemId);

  switch (itemType) {
    case 'warranty':
      await scheduleWarrantyReminders(
        ownerUserId,
        itemId,
        item.product_name,
        item.expiry_date,
        item.reminder_schedule
      );
      break;
    case 'subscription': {
      const nextDate = item.next_billing_date
        ? new Date(item.next_billing_date)
        : getInitialSubscriptionDueDate(item.start_date, item.billing_cycle);
      await scheduleSubscriptionRemindersForDate(
        ownerUserId,
        itemId,
        item.service_name,
        nextDate,
        item.billing_cycle,
        item.reminder_schedule
      );
      break;
    }
    case 'reminder':
      await scheduleManualReminder(
        ownerUserId,
        itemId,
        item.title,
        item.reminder_date,
        item.remind_time,
        item.reminder_schedule,
        item.repeat_cycle
      );
      break;
    case 'todo':
      if (item.has_reminder && item.reminder_date && !item.is_completed) {
        await scheduleTodoReminder(
          ownerUserId,
          itemId,
          item.task_name,
          item.reminder_date,
          item.reminder_schedule
        );
      }
      break;
  }

  await syncShareNotificationsForItem(ownerUserId, itemType, itemId);
}

export async function createShares(
  ownerUserId: string,
  recipientUserId: string,
  items: ShareItemInput[]
) {
  await assertCanCreateShare(ownerUserId);

  if (ownerUserId === recipientUserId) {
    throw new Error('You cannot share with yourself.');
  }

  if (!items.length) {
    throw new Error('Select at least one item to share.');
  }

  const { data: recipient } = await supabase
    .from('users')
    .select('id, first_name, last_name')
    .eq('id', recipientUserId)
    .maybeSingle();

  if (!recipient) throw new Error('Recipient not found.');

  const created: any[] = [];
  const skipped: string[] = [];

  for (const { itemType, itemId } of items) {
    await fetchOwnedItem(ownerUserId, itemType, itemId);

    const { data: existing } = await supabase
      .from('item_shares')
      .select('id')
      .eq('owner_user_id', ownerUserId)
      .eq('recipient_user_id', recipientUserId)
      .eq('item_type', itemType)
      .eq('item_id', itemId)
      .is('revoked_at', null)
      .maybeSingle();

    if (existing) {
      skipped.push(itemLabel(itemType, await fetchOwnedItem(ownerUserId, itemType, itemId)));
      continue;
    }

    const { data: row, error } = await supabase
      .from('item_shares')
      .insert({
        owner_user_id: ownerUserId,
        recipient_user_id: recipientUserId,
        item_type: itemType,
        item_id: itemId,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    created.push(row);
    await syncShareNotificationsForItem(ownerUserId, itemType, itemId);
  }

  return {
    created,
    recipientDisplayName: displayName(recipient),
    skipped,
  };
}

export async function revokeShare(shareId: string, ownerUserId: string) {
  const { data: share, error } = await supabase
    .from('item_shares')
    .select('*')
    .eq('id', shareId)
    .eq('owner_user_id', ownerUserId)
    .is('revoked_at', null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!share) throw new Error('Share not found.');

  const { error: updateError } = await supabase
    .from('item_shares')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', shareId);

  if (updateError) throw new Error(updateError.message);

  await supabase
    .from('scheduled_notifications')
    .delete()
    .eq('reference_id', share.item_id)
    .eq('user_id', share.recipient_user_id)
    .eq('shared_from_user_id', ownerUserId)
    .eq('status', 'pending');

  return share;
}

export async function removeSharesForItem(itemType: ShareItemType, itemId: string) {
  const { data: shares } = await supabase
    .from('item_shares')
    .select('id, owner_user_id, recipient_user_id')
    .eq('item_type', itemType)
    .eq('item_id', itemId)
    .is('revoked_at', null);

  if (!shares?.length) return;

  await supabase
    .from('item_shares')
    .update({ revoked_at: new Date().toISOString() })
    .eq('item_type', itemType)
    .eq('item_id', itemId)
    .is('revoked_at', null);

  for (const s of shares) {
    await supabase
      .from('scheduled_notifications')
      .delete()
      .eq('reference_id', itemId)
      .eq('user_id', s.recipient_user_id)
      .eq('shared_from_user_id', s.owner_user_id)
      .eq('status', 'pending');
  }
}

async function enrichShares(shares: any[], perspective: 'sent' | 'received') {
  const enriched = [];

  for (const share of shares) {
    const otherUserId = perspective === 'sent' ? share.recipient_user_id : share.owner_user_id;
    const { data: otherUser } = await supabase
      .from('users')
      .select('first_name, last_name, email, phone')
      .eq('id', otherUserId)
      .single();

    let item: any = null;
    let label = 'Unknown item';
    try {
      item = await fetchItemForRecipient(share.item_type, share.item_id);
      label = itemLabel(share.item_type, item);
    } catch {
      item = null;
    }

    enriched.push({
      id: share.id,
      itemType: share.item_type,
      itemId: share.item_id,
      itemLabel: label,
      item,
      createdAt: share.created_at,
      otherUser: otherUser
        ? {
            id: otherUserId,
            displayName: displayName(otherUser),
            email: otherUser.email,
            phone: otherUser.phone,
          }
        : { id: otherUserId, displayName: 'Trakkit user' },
    });
  }

  return enriched;
}

export async function listSentShares(ownerUserId: string) {
  const { data, error } = await supabase
    .from('item_shares')
    .select('*')
    .eq('owner_user_id', ownerUserId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return enrichShares(data || [], 'sent');
}

export async function listReceivedShares(recipientUserId: string) {
  const { data, error } = await supabase
    .from('item_shares')
    .select('*')
    .eq('recipient_user_id', recipientUserId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return enrichShares(data || [], 'received');
}

export async function getReceivedShareDetail(shareId: string, recipientUserId: string) {
  const { data: share, error } = await supabase
    .from('item_shares')
    .select('*')
    .eq('id', shareId)
    .eq('recipient_user_id', recipientUserId)
    .is('revoked_at', null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!share) throw new Error('Share not found.');

  const [enriched] = await enrichShares([share], 'received');
  return enriched;
}
