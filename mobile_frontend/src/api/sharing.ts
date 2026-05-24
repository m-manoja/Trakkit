import { API_BASE_URL } from './config';

export type ShareItemType = 'warranty' | 'subscription' | 'reminder' | 'todo';

export interface ShareItemPayload {
  itemType: ShareItemType;
  itemId: string;
}

export interface ResolvedUser {
  userId: string;
  displayName: string;
  email?: string;
  phone?: string;
}

export interface ShareListEntry {
  id: string;
  itemType: ShareItemType;
  itemId: string;
  itemLabel: string;
  item: Record<string, unknown> | null;
  createdAt: string;
  otherUser: {
    id: string;
    displayName: string;
    email?: string;
    phone?: string;
  };
}

export interface CreateShareResult {
  created: unknown[];
  recipientDisplayName: string;
  skipped: string[];
}

async function parseJson<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.message || json.error || 'Request failed');
  }
  return json.data as T;
}

export async function resolveShareRecipient(
  params: { email?: string; phone?: string },
  token: string
): Promise<ResolvedUser> {
  const res = await fetch(`${API_BASE_URL}/api/sharing/resolve`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  return parseJson(res);
}

export async function createShare(
  recipientUserId: string,
  items: ShareItemPayload[],
  token: string
): Promise<CreateShareResult> {
  const res = await fetch(`${API_BASE_URL}/api/sharing`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ recipientUserId, items }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || json.error || 'Failed to share');
  }
  return json.data as CreateShareResult;
}

export async function revokeShare(shareId: string, token: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/sharing/${shareId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || 'Failed to remove share');
  }
}

export async function fetchSentShares(token: string): Promise<ShareListEntry[]> {
  const res = await fetch(`${API_BASE_URL}/api/sharing/sent`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson(res);
}

export async function fetchReceivedShares(token: string): Promise<ShareListEntry[]> {
  const res = await fetch(`${API_BASE_URL}/api/sharing/received`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return parseJson(res);
}
