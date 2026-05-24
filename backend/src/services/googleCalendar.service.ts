import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import config from '../config.js';
import { supabase } from '../config/supabaseClient.js';
import { getUserPlan } from './payment.service.js';
import * as warrantyService from './warranty.service.js';
import * as subscriptionService from './subscription.service.js';
import * as reminderService from './reminder.service.js';
import * as todoService from './todo.service.js';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
];
const TRAKKIT_PROP = 'trakkitEventKey';
const CALENDAR_ID = 'primary';
type CalendarClient = ReturnType<typeof google.calendar>;

/** Prevent two syncs at once (e.g. OAuth redirect + button click) from creating duplicates */
const syncLocks = new Map<string, Promise<{
  created: number;
  updated: number;
  removed: number;
  duplicatesRemoved: number;
  total: number;
  email: string | null;
}>>();

export type TrakkitCalendarEvent = {
  key: string;
  type: string;
  label: string;
  date: string;
};

function getRedirectUri(): string {
  return (
    process.env.GOOGLE_REDIRECT_URI ||
    `http://localhost:${process.env.PORT || 5000}/api/google-calendar/callback`
  );
}

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Google Calendar is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
  }
  return new google.auth.OAuth2(clientId, clientSecret, getRedirectUri());
}

function toDateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const iso = d.toISOString().split('T')[0];
  return iso ?? null;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  const iso = d.toISOString().split('T')[0];
  if (!iso) throw new Error('Invalid date');
  return iso;
}

export async function assertPremium(userId: string): Promise<void> {
  const { plan } = await getUserPlan(userId);
  if (plan !== 'premium') {
    throw new Error('Google Calendar sync is available on the Premium plan only.');
  }
}

export type OAuthPlatform = 'web' | 'mobile';

export function createOAuthState(userId: string, platform: OAuthPlatform = 'web'): string {
  return jwt.sign(
    { userId, purpose: 'google_calendar', platform },
    config.jwt.secret,
    { expiresIn: '15m' }
  );
}

export function parseOAuthState(state: string): { userId: string; platform: OAuthPlatform } {
  const decoded = jwt.verify(state, config.jwt.secret) as {
    userId?: string;
    purpose?: string;
    platform?: string;
  };
  if (decoded.purpose !== 'google_calendar' || !decoded.userId) {
    throw new Error('Invalid OAuth state');
  }
  return {
    userId: decoded.userId,
    platform: decoded.platform === 'mobile' ? 'mobile' : 'web',
  };
}

export function getAuthorizationUrl(userId: string, platform: OAuthPlatform = 'web'): string {
  const oauth2 = getOAuth2Client();
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state: createOAuthState(userId, platform),
  });
}

function emailFromIdToken(idToken?: string | null): string {
  if (!idToken) return '';
  try {
    const payload = idToken.split('.')[1];
    if (!payload) return '';
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return typeof json.email === 'string' ? json.email : '';
  } catch {
    return '';
  }
}

async function oauth2ClientWithRefreshToken(refreshToken: string) {
  const oauth2 = getOAuth2Client();
  oauth2.setCredentials({ refresh_token: refreshToken });
  try {
    const { token } = await oauth2.getAccessToken();
    if (!token) {
      throw new Error('Could not obtain a Google access token.');
    }
  } catch (err: any) {
    const msg = err?.message || '';
    if (msg.includes('invalid_grant')) {
      throw new Error(
        'Google Calendar access expired. Disconnect in Trakkit and click Sync with Google Calendar to connect again.'
      );
    }
    throw new Error(msg || 'Google authentication failed');
  }
  return oauth2;
}

export async function handleOAuthCallback(code: string, state: string): Promise<{ email: string; platform: OAuthPlatform }> {
  const { userId, platform } = parseOAuthState(state);
  await assertPremium(userId);

  const oauth2 = getOAuth2Client();
  const { tokens } = await oauth2.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error('Google did not return a refresh token. Revoke Trakkit access in your Google account and try again.');
  }

  oauth2.setCredentials(tokens);

  let email = emailFromIdToken(tokens.id_token);
  if (!email) {
    const oauth2api = google.oauth2({ version: 'v2', auth: oauth2 });
    const { data: profile } = await oauth2api.userinfo.get();
    email = profile.email || '';
  }

  const { error } = await supabase
    .from('users')
    .update({
      google_refresh_token: tokens.refresh_token,
      google_calendar_email: email,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    throw new Error(error.message);
  }

  return { email, platform };
}

export async function getConnectionStatus(userId: string): Promise<{
  connected: boolean;
  email: string | null;
}> {
  const { data, error } = await supabase
    .from('users')
    .select('google_refresh_token, google_calendar_email')
    .eq('id', userId)
    .single();

  if (error) throw new Error(error.message);

  return {
    connected: Boolean(data?.google_refresh_token),
    email: data?.google_calendar_email ?? null,
  };
}

async function listAllTrakkitGoogleEventIds(calendar: CalendarClient): Promise<string[]> {
  const ids: string[] = [];
  const now = new Date();
  const timeMin = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString();
  const timeMax = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate()).toISOString();
  let pageToken: string | undefined;

  do {
    const listRes = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin,
      timeMax,
      singleEvents: true,
      maxResults: 2500,
      pageToken,
    });

    for (const item of listRes.data.items || []) {
      const key = item.extendedProperties?.private?.[TRAKKIT_PROP];
      if (key && item.id) ids.push(item.id);
    }
    pageToken = listRes.data.nextPageToken || undefined;
  } while (pageToken);

  return ids;
}

export async function removeTrakkitEventsFromGoogle(userId: string): Promise<number> {
  const { calendar } = await getAuthenticatedCalendar(userId);
  const ids = await listAllTrakkitGoogleEventIds(calendar);

  for (const eventId of ids) {
    await calendar.events.delete({ calendarId: CALENDAR_ID, eventId });
  }

  return ids.length;
}

export async function disconnectGoogleCalendar(
  userId: string,
  options?: { removeEvents?: boolean }
): Promise<{ eventsRemoved: number }> {
  let eventsRemoved = 0;

  if (options?.removeEvents) {
    eventsRemoved = await removeTrakkitEventsFromGoogle(userId);
  }

  const { error } = await supabase
    .from('users')
    .update({
      google_refresh_token: null,
      google_calendar_email: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw new Error(error.message);

  return { eventsRemoved };
}

async function getAuthenticatedCalendar(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('google_refresh_token, google_calendar_email')
    .eq('id', userId)
    .single();

  if (error) throw new Error(error.message);
  if (!data?.google_refresh_token) {
    throw new Error('Google Calendar is not connected. Click Sync with Google Calendar to connect your Gmail account.');
  }

  const oauth2 = await oauth2ClientWithRefreshToken(data.google_refresh_token);
  const calendar = google.calendar({ version: 'v3', auth: oauth2 });

  return { calendar, email: data.google_calendar_email as string | null };
}

export async function collectTrakkitEvents(userId: string): Promise<TrakkitCalendarEvent[]> {
  const events: TrakkitCalendarEvent[] = [];

  const [warranties, subscriptions, reminders, todos] = await Promise.all([
    warrantyService.getWarrantiesByUserId(userId),
    subscriptionService.getSubscriptionsByUserId(userId),
    reminderService.getRemindersByUserId(userId),
    todoService.getTodosByUserId(userId),
  ]);

  for (const w of warranties) {
    const date = toDateOnly(w.expiry_date);
    if (!date) continue;
    events.push({
      key: `warranty:${w.id}`,
      type: 'warranty',
      label: `${w.product_name} warranty expires`,
      date,
    });
  }

  for (const s of subscriptions) {
    const date = toDateOnly(s.next_billing_date);
    if (!date) continue;
    events.push({
      key: `subscription:${s.id}`,
      type: 'subscription',
      label: `${s.service_name} billing`,
      date,
    });
  }

  for (const r of reminders) {
    const date = toDateOnly(r.reminder_date);
    if (!date) continue;
    events.push({
      key: `reminder:${r.id}`,
      type: 'reminder',
      label: r.title,
      date,
    });
  }

  for (const t of todos) {
    if (t.is_completed || !t.has_reminder) continue;
    const date = toDateOnly(t.reminder_date);
    if (!date) continue;
    events.push({
      key: `todo:${t.id}`,
      type: 'todo',
      label: t.task_name,
      date,
    });
  }

  return events;
}

async function listGoogleEventIdsByTrakkitKey(
  calendar: CalendarClient,
  trakkitKey: string
): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;

  do {
    const res = await calendar.events.list({
      calendarId: CALENDAR_ID,
      privateExtendedProperty: [`${TRAKKIT_PROP}=${trakkitKey}`],
      maxResults: 2500,
      pageToken,
    });
    for (const item of res.data.items || []) {
      if (item.id) ids.push(item.id);
    }
    pageToken = res.data.nextPageToken || undefined;
  } while (pageToken);

  return ids;
}

/** Remove extra Google events that share the same Trakkit id (from double-sync). */
async function dedupeTrakkitKey(
  calendar: CalendarClient,
  trakkitKey: string
): Promise<{ keepId: string | null; duplicatesRemoved: number }> {
  const ids = await listGoogleEventIdsByTrakkitKey(calendar, trakkitKey);
  if (ids.length === 0) return { keepId: null, duplicatesRemoved: 0 };

  const keepId = ids[0];
  let duplicatesRemoved = 0;
  for (let i = 1; i < ids.length; i++) {
    await calendar.events.delete({ calendarId: CALENDAR_ID, eventId: ids[i] });
    duplicatesRemoved++;
  }
  return { keepId, duplicatesRemoved };
}

async function runSyncEventsToGoogleCalendar(userId: string): Promise<{
  created: number;
  updated: number;
  removed: number;
  duplicatesRemoved: number;
  total: number;
  email: string | null;
}> {
  await assertPremium(userId);
  const { calendar, email } = await getAuthenticatedCalendar(userId);
  const desired = await collectTrakkitEvents(userId);
  const desiredKeys = new Set(desired.map((e) => e.key));

  let created = 0;
  let updated = 0;
  let removed = 0;
  let duplicatesRemoved = 0;

  for (const ev of desired) {
    const { keepId, duplicatesRemoved: dupes } = await dedupeTrakkitKey(calendar, ev.key);
    duplicatesRemoved += dupes;

    const body = {
      summary: ev.label,
      description: `Trakkit ${ev.type} — synced from your Trakkit calendar`,
      start: { date: ev.date },
      end: { date: addDays(ev.date, 1) },
      extendedProperties: {
        private: {
          [TRAKKIT_PROP]: ev.key,
        },
      },
    };

    if (keepId) {
      await calendar.events.update({
        calendarId: CALENDAR_ID,
        eventId: keepId,
        requestBody: body,
      });
      updated++;
    } else {
      await calendar.events.insert({
        calendarId: CALENDAR_ID,
        requestBody: body,
      });
      created++;
    }
  }

  // Delete Trakkit events on Google that were removed from the app
  const now = new Date();
  const timeMin = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString();
  const timeMax = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate()).toISOString();
  let pageToken: string | undefined;

  do {
    const listRes = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin,
      timeMax,
      singleEvents: true,
      maxResults: 2500,
      pageToken,
    });

    for (const item of listRes.data.items || []) {
      const key = item.extendedProperties?.private?.[TRAKKIT_PROP];
      if (key && item.id && !desiredKeys.has(key)) {
        await calendar.events.delete({ calendarId: CALENDAR_ID, eventId: item.id });
        removed++;
      }
    }
    pageToken = listRes.data.nextPageToken || undefined;
  } while (pageToken);

  return {
    created,
    updated,
    removed,
    duplicatesRemoved,
    total: desired.length,
    email,
  };
}

export async function syncEventsToGoogleCalendar(userId: string): Promise<{
  created: number;
  updated: number;
  removed: number;
  duplicatesRemoved: number;
  total: number;
  email: string | null;
}> {
  const inFlight = syncLocks.get(userId);
  if (inFlight) return inFlight;

  const promise = runSyncEventsToGoogleCalendar(userId).finally(() => {
    syncLocks.delete(userId);
  });
  syncLocks.set(userId, promise);
  return promise;
}

/** Push calendar changes to Google when connected (fire-and-forget; no-op if disconnected). */
export function triggerGoogleCalendarSync(userId: string | null | undefined): void {
  if (!userId) return;

  void (async () => {
    try {
      const { connected } = await getConnectionStatus(userId);
      if (!connected) return;

      const { plan } = await getUserPlan(userId);
      if (plan !== 'premium') return;

      await syncEventsToGoogleCalendar(userId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Google Calendar] auto-sync for ${userId}:`, msg);
    }
  })();
}
