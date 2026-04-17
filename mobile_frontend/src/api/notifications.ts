import { API_BASE_URL } from './config';

export interface AppNotification {
  id: string;
  user_id: string;
  reference_id: string;
  reference_type: 'subscription' | 'warranty' | 'todo' | 'manual_reminder';
  title: string;
  body: string;
  scheduled_for: string;
  status: 'pending' | 'sent' | 'failed';
  created_at: string;
}

export async function fetchNotifications(token: string): Promise<AppNotification[]> {
  const response = await fetch(`${API_BASE_URL}/api/notifications`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error || 'Failed to fetch notifications');
  return result.data || [];
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
