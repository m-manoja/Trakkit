import bcrypt from 'bcryptjs';
import { supabase } from '../config/supabaseClient.js';

type AdminUserRow = {
  id: string;
  username: string;
  password_hash: string;
  active: boolean;
};

export async function verifyAdminCredentials(username?: string, password?: string) {
  const cleanUsername = typeof username === 'string' ? username.trim() : '';

  if (!cleanUsername || !password) {
    return null;
  }

  const { data, error } = await supabase
    .from('admin_users')
    .select('id, username, password_hash, active')
    .eq('username', cleanUsername)
    .eq('active', true)
    .maybeSingle<AdminUserRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.password_hash) {
    return null;
  }

  const matches = await bcrypt.compare(password, data.password_hash);
  if (!matches) {
    return null;
  }

  return {
    id: data.id,
    username: data.username,
  };
}
