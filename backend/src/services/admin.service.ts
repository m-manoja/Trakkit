import { supabase } from '../config/supabaseClient.js';

export interface ListUsersParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// Columns safe to expose to the admin portal (no password hashes / tokens).
const USER_COLUMNS =
  'id, first_name, last_name, email, phone, plan, plan_activated_at, profile_completed, email_verified, created_at';

const tableCount = async (table: string, build?: (q: any) => any): Promise<number> => {
  const base = supabase.from(table).select('id', { count: 'exact', head: true });
  const { count, error } = await (build ? build(base) : base);
  if (error) throw new Error(error.message);
  return count ?? 0;
};

const countByUser = async (table: string, userColumn: string, userId: string): Promise<number> => {
  return tableCount(table, (q) => q.eq(userColumn, userId));
};

const getUserCounts = async (userId: string) => {
  const [warranties, subscriptions, reminders, todos] = await Promise.all([
    countByUser('warranties', 'userId', userId),
    countByUser('subscriptions', 'userId', userId),
    countByUser('manual_reminders', 'user_id', userId),
    countByUser('todos', 'user_id', userId),
  ]);

  return { warranties, subscriptions, reminders, todos };
};

export const listUsers = async ({ search, page = 1, pageSize = DEFAULT_PAGE_SIZE }: ListUsersParams) => {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(pageSize) || DEFAULT_PAGE_SIZE));
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;

  let query = supabase
    .from('users')
    .select(USER_COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search && search.trim()) {
    const term = search.trim();
    // Match across name, email and phone.
    query = query.or(
      `first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`
    );
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const total = count ?? 0;
  const users = await Promise.all(
    (data ?? []).map(async (user) => ({
      ...user,
      counts: await getUserCounts(user.id),
    }))
  );

  return {
    users,
    total,
    page: safePage,
    pageSize: safeSize,
    totalPages: Math.max(1, Math.ceil(total / safeSize)),
  };
};

export const getUserStats = async () => {
  const today = new Date();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const todayDate = today.toISOString().slice(0, 10);
  const next30Date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [
    total,
    premium,
    verified,
    completed,
    recent30,
    recent7,
    totalWarranties,
    activeWarranties,
    claimedWarranties,
    warrantiesWithDocuments,
    warrantiesExpiring30,
    totalSubscriptions,
    activeSubscriptions,
    subscriptionsDue30,
    totalReminders,
    totalTodos,
    completedTodos,
    pendingNotifications,
    sentNotifications,
    totalShares,
    pushTokens,
  ] = await Promise.all([
    tableCount('users'),
    tableCount('users', (q) => q.eq('plan', 'premium')),
    tableCount('users', (q) => q.eq('email_verified', true)),
    tableCount('users', (q) => q.eq('profile_completed', true)),
    tableCount('users', (q) => q.gte('created_at', thirtyDaysAgo)),
    tableCount('users', (q) => q.gte('created_at', sevenDaysAgo)),
    tableCount('warranties'),
    tableCount('warranties', (q) => q.eq('status', 'Active')),
    tableCount('warranties', (q) => q.eq('status', 'Claimed')),
    tableCount('warranties', (q) => q.not('document_url', 'is', null)),
    tableCount('warranties', (q) => q.gte('expiry_date', todayDate).lte('expiry_date', next30Date)),
    tableCount('subscriptions'),
    tableCount('subscriptions', (q) => q.eq('status', 'Active')),
    tableCount('subscriptions', (q) => q.gte('next_billing_date', todayDate).lte('next_billing_date', next30Date)),
    tableCount('manual_reminders'),
    tableCount('todos'),
    tableCount('todos', (q) => q.eq('is_completed', true)),
    tableCount('scheduled_notifications', (q) => q.eq('status', 'pending')),
    tableCount('scheduled_notifications', (q) => q.eq('status', 'sent')),
    tableCount('item_shares'),
    tableCount('push_tokens'),
  ]);

  const { data: subscriptions, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('amount, status');
  if (subscriptionError) throw new Error(subscriptionError.message);

  const subscriptionAmountTotal = (subscriptions ?? []).reduce((sum, item: any) => {
    const amount = Number(item.amount);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);

  return {
    totalUsers: total,
    premiumUsers: premium,
    freeUsers: Math.max(0, total - premium),
    verifiedUsers: verified,
    completedProfiles: completed,
    newLast30Days: recent30,
    newLast7Days: recent7,
    verificationRate: total ? Math.round((verified / total) * 100) : 0,
    profileCompletionRate: total ? Math.round((completed / total) * 100) : 0,
    premiumRate: total ? Math.round((premium / total) * 100) : 0,
    appData: {
      warranties: {
        total: totalWarranties,
        active: activeWarranties,
        claimed: claimedWarranties,
        withDocuments: warrantiesWithDocuments,
        expiringNext30Days: warrantiesExpiring30,
      },
      subscriptions: {
        total: totalSubscriptions,
        active: activeSubscriptions,
        dueNext30Days: subscriptionsDue30,
        amountTotal: subscriptionAmountTotal,
      },
      reminders: {
        total: totalReminders,
      },
      todos: {
        total: totalTodos,
        completed: completedTodos,
        open: Math.max(0, totalTodos - completedTodos),
      },
      notifications: {
        pending: pendingNotifications,
        sent: sentNotifications,
      },
      shares: {
        total: totalShares,
      },
      pushTokens: {
        total: pushTokens,
      },
    },
  };
};

export const getUserDetail = async (id: string) => {
  const { data: user, error } = await supabase
    .from('users')
    .select(USER_COLUMNS)
    .eq('id', id)
    .single();

  if (error || !user) throw new Error(error?.message || 'User not found');

  const [counts, warranties, subscriptions, reminders, todos] = await Promise.all([
    getUserCounts(id),
    supabase
      .from('warranties')
      .select('id, product_name, purchase_place, expiry_date, status, document_url, created_at')
      .eq('userId', id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('subscriptions')
      .select('id, service_name, amount, billing_cycle, next_billing_date, status, created_at')
      .eq('userId', id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('manual_reminders')
      .select('id, title, reminder_date, repeat_cycle, reminder_schedule, created_at')
      .eq('user_id', id)
      .order('reminder_date', { ascending: true })
      .limit(5),
    supabase
      .from('todos')
      .select('id, task_name, is_completed, has_reminder, reminder_date, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  for (const result of [warranties, subscriptions, reminders, todos]) {
    if (result.error) throw new Error(result.error.message);
  }

  return {
    ...user,
    counts,
    summaries: {
      warranties: warranties.data ?? [],
      subscriptions: subscriptions.data ?? [],
      reminders: reminders.data ?? [],
      todos: todos.data ?? [],
    },
  };
};

// Hard-deletes a user and all of their related data. Uses the service-role
// client so it bypasses RLS. Auth user removal is best-effort.
export const deleteUser = async (id: string) => {
  // Tables that reference the user via user_id.
  const ownedTables = [
    'scheduled_notifications',
    'manual_reminders',
    'warranties',
    'subscriptions',
    'todos',
    'notification_settings',
    'push_tokens',
  ];

  for (const table of ownedTables) {
    const { error } = await supabase.from(table).delete().eq('user_id', id);
    if (error) console.error(`Failed clearing ${table} for user ${id}:`, error.message);
  }

  // Shares where the user is either the owner or recipient.
  await supabase.from('item_shares').delete().eq('owner_user_id', id);
  await supabase.from('item_shares').delete().eq('recipient_user_id', id);

  const { error: userError } = await supabase.from('users').delete().eq('id', id);
  if (userError) throw new Error(userError.message);

  // Best-effort removal from Supabase Auth (id matches the auth user id).
  try {
    await supabase.auth.admin.deleteUser(id);
  } catch (e) {
    console.error('Failed to delete auth user (non-fatal):', e);
  }

  return true;
};
