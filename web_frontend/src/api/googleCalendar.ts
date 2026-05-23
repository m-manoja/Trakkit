const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

async function parseJson(res: Response) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Google Calendar request failed');
  }
  return json.data;
}

export async function getGoogleCalendarStatus(token: string): Promise<GoogleCalendarStatus> {
  const res = await fetch(`${API_BASE}/api/google-calendar/status`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson(res);
}

export async function getGoogleCalendarAuthUrl(token: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/google-calendar/auth-url`, {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseJson(res);
  return data.url as string;
}

export async function syncGoogleCalendar(token: string): Promise<GoogleCalendarSyncResult> {
  const res = await fetch(`${API_BASE}/api/google-calendar/sync`, {
    method: 'POST',
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson(res);
}

export type GoogleCalendarDisconnectResult = {
  eventsRemoved: number;
};

export async function disconnectGoogleCalendar(
  token: string,
  removeEvents: boolean
): Promise<GoogleCalendarDisconnectResult> {
  const res = await fetch(`${API_BASE}/api/google-calendar/disconnect`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ removeEvents }),
  });
  return parseJson(res);
}
