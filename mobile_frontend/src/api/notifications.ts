import { API_BASE_URL } from './config';

export interface AppNotification {
  id: string;
  user_id: string;
  reference_id: string;
  reference_type: 'subscription' | 'warranty' | 'todo' | 'manual_reminder';
  title: string;
  body: string;
  scheduled_for: string;
  status: 'pending' | 'notified' | 'sent' | 'failed';  // 'notified' = worker sent SMS, not yet seen in-app
  created_at: string;
}

export interface FetchNotificationsResult {
  notifications: AppNotification[];
  newIds: Set<string>;
}

export async function fetchNotifications(token: string): Promise<FetchNotificationsResult> {
  const response = await fetch(`${API_BASE_URL}/api/notifications`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error || 'Failed to fetch notifications');
  return {
    notifications: result.data || [],
    newIds: new Set<string>(result.newIds || []),
  };
}

export async function fetchUnreadCount(token: string): Promise<number> {
  const response = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error || 'Failed to fetch unread count');
  return result.count || 0;
}

export async function deleteNotification(id: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/notifications/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result?.error || 'Failed to delete notification');
  }
}

export async function markNotificationsRead(ids: string[], token: string): Promise<void> {
  if (ids.length === 0) return;
  const response = await fetch(`${API_BASE_URL}/api/notifications/mark-read`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result?.error || 'Failed to mark notifications as read');
  }
}

export async function clearAllNotifications(token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/notifications/clear-all`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result?.error || 'Failed to clear notifications');
  }
}
