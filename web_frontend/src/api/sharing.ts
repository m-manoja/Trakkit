import { API_BASE_URL } from './config';
import { apiRequest } from './client';

export type ShareItemType = 'warranty' | 'subscription' | 'reminder' | 'todo';
export type ShareStatus = 'pending' | 'accepted' | 'declined';

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
  status: ShareStatus;
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

export async function resolveShareRecipient(
  params: { email?: string; phone?: string },
  token: string
): Promise<ResolvedUser> {
  return apiRequest<ResolvedUser>('/api/sharing/resolve', 'POST', params, token);
}

export async function createShare(
  recipientUserId: string,
  items: ShareItemPayload[],
  token: string
): Promise<CreateShareResult> {
  const response = await fetch(`${API_BASE_URL}/api/sharing`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ recipientUserId, items }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.message || result?.error || 'Failed to share');
  }
  return result.data as CreateShareResult;
}

export async function revokeShare(shareId: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/sharing/${shareId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.message || 'Failed to remove share');
  }
}

export async function respondToShare(
  shareId: string,
  action: 'accept' | 'decline',
  token: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/sharing/received/${shareId}/respond`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.message || 'Failed to respond to share');
  }
}

export async function fetchSentShares(token: string): Promise<ShareListEntry[]> {
  return apiRequest<ShareListEntry[]>('/api/sharing/sent', 'GET', undefined, token);
}

export async function fetchReceivedShares(token: string): Promise<ShareListEntry[]> {
  return apiRequest<ShareListEntry[]>('/api/sharing/received', 'GET', undefined, token);
}

export async function fetchReceivedShareDetail(
  shareId: string,
  token: string
): Promise<ShareListEntry> {
  return apiRequest<ShareListEntry>(`/api/sharing/received/${shareId}`, 'GET', undefined, token);
}
