import { API_BASE_URL } from './config';

export type GoogleCalendarStatus = {
  connected: boolean;
  email: string | null;
};

export type GoogleCalendarSyncResult = {
  created: number;
  updated: number;
  removed: number;
  duplicatesRemoved?: number;
  total: number;
  email: string | null;
};

export type GoogleCalendarDisconnectResult = {
  eventsRemoved: number;
};

async function parseJson<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Google Calendar request failed');
  }
  return json.data as T;
}

export async function getGoogleCalendarStatus(token: string): Promise<GoogleCalendarStatus> {
  const res = await fetch(`${API_BASE_URL}/api/google-calendar/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson(res);
}

export async function getGoogleCalendarAuthUrl(token: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/api/google-calendar/auth-url?platform=mobile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseJson<{ url: string }>(res);
  return data.url;
}

export async function syncGoogleCalendar(token: string): Promise<GoogleCalendarSyncResult> {
  const res = await fetch(`${API_BASE_URL}/api/google-calendar/sync`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson(res);
}

export async function disconnectGoogleCalendar(
  token: string,
  removeEvents: boolean
): Promise<GoogleCalendarDisconnectResult> {
  const res = await fetch(`${API_BASE_URL}/api/google-calendar/disconnect`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ removeEvents }),
  });
  return parseJson(res);
}
