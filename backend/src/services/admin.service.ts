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
  const users = data ?? [];

  return {
    users,
    total,
    page: safePage,
    pageSize: safeSize,
    totalPages: Math.max(1, Math.ceil(total / safeSize)),
  };
};

export const getUserStats = async () => {
  const countOf = async (build: (q: any) => any): Promise<number> => {
    const { count, error } = await build(
      supabase.from('users').select('id', { count: 'exact', head: true })
    );
    if (error) throw new Error(error.message);
    return count ?? 0;
  };

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [total, premium, verified, completed, recent] = await Promise.all([
    countOf((q) => q),
    countOf((q) => q.eq('plan', 'premium')),
    countOf((q) => q.eq('email_verified', true)),
    countOf((q) => q.eq('profile_completed', true)),
    countOf((q) => q.gte('created_at', thirtyDaysAgo)),
  ]);

  return {
    totalUsers: total,
    premiumUsers: premium,
    freeUsers: Math.max(0, total - premium),
    verifiedUsers: verified,
    completedProfiles: completed,
    newLast30Days: recent,
  };
};

export const getUserDetail = async (id: string) => {
  const { data: user, error } = await supabase
    .from('users')
    .select(USER_COLUMNS)
    .eq('id', id)
    .single();

  if (error || !user) throw new Error(error?.message || 'User not found');

  const countFor = async (table: string): Promise<number> => {
    const { count } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', id);
    return count ?? 0;
  };

  const [warranties, subscriptions, reminders, todos] = await Promise.all([
    countFor('warranties'),
    countFor('subscriptions'),
    countFor('manual_reminders'),
    countFor('todos'),
  ]);

  return {
    ...user,
    counts: { warranties, subscriptions, reminders, todos },
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
