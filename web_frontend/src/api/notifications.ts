import { API_BASE_URL } from "./config";
import { apiRequest } from "./client";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  reference_type: string;
  reference_id: string;
  status: 'pending' | 'notified' | 'sent' | 'failed';  // 'notified' = worker sent SMS, not yet seen in-app
  scheduled_for: string;
  created_at: string;
}

export async function fetchNotifications(token: string): Promise<AppNotification[]> {
  return apiRequest<AppNotification[]>("/api/notifications", "GET", undefined, token);
}

export async function fetchUnreadCount(token: string): Promise<{count: number}> {
  // Using direct fetch because apiRequest expects data wrapper
  const response = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const res = await response.json();
  if (!response.ok) throw new Error(res.error || "Failed to fetch unread count");
  return { count: res.count };
}

export async function deleteNotification(id: string, token: string): Promise<void> {
  return apiRequest<void>(`/api/notifications/${id}`, "DELETE", undefined, token);
}

export async function markNotificationsRead(ids: string[], token: string): Promise<void> {
  if (ids.length === 0) return;
  return apiRequest<void>("/api/notifications/mark-read", "PATCH", { ids }, token);
}

export async function clearAllNotifications(token: string): Promise<void> {
  return apiRequest<void>("/api/notifications/clear-all", "DELETE", undefined, token);
}
