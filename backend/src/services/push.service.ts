import { supabase } from '../config/supabaseClient.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export async function registerPushToken(userId: string, token: string, platform = 'expo') {
  const { error } = await supabase.from('push_tokens').upsert(
    {
      user_id: userId,
      token,
      platform,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,token' }
  );

  if (error) {
    console.error('[Push] Failed to register token:', error.message);
    throw new Error(error.message);
  }
}

export async function removePushToken(userId: string, token: string) {
  await supabase.from('push_tokens').delete().eq('user_id', userId).eq('token', token);
}

/** Sends Expo push to all tokens for a user. Returns true if at least one send succeeded. */
export async function sendExpoPushToUser(
  userId: string,
  title: string,
  body: string
): Promise<boolean> {
  const { data: rows, error } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId);

  if (error || !rows?.length) {
    return false;
  }

  const messages = rows.map((row) => ({
    to: row.token,
    title,
    body,
    sound: 'default' as const,
  }));

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Push] Expo API error: ${response.status} - ${errText}`);
      return false;
    }

    const result = (await response.json()) as { data?: Array<{ status: string }> };
    const tickets = result.data ?? [];
    const ok = tickets.some((t) => t.status === 'ok');
    if (!ok) {
      console.error('[Push] Expo tickets:', JSON.stringify(tickets));
    }
    return ok;
  } catch (err) {
    console.error('[Push] send failed:', err);
    return false;
  }
}
