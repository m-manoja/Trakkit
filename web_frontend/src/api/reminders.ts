import { API_BASE_URL } from "./config";
import { apiRequest } from "./client";

export interface Reminder {
  id: string;
  title: string;
  type: string;
  reminder_date: string;
  repeat_cycle: string | null;
  remind_time: string;
  description: string;
  reminder_schedule: string | null;
  status?: string;
}

export async function fetchReminders(userId: string, token: string): Promise<Reminder[]> {
  return apiRequest<Reminder[]>(`/api/reminders/user/${userId}`, "GET", undefined, token);
}

export async function deleteReminder(id: string, token: string): Promise<void> {
  return apiRequest<void>(`/api/reminders/${id}`, "DELETE", undefined, token);
}

export async function saveReminder(
  id: string | null,
  data: any,
  token: string
): Promise<Reminder> {
  const endpoint = id ? `/api/reminders/${id}` : "/api/reminders/add";
  const method = id ? "PUT" : "POST";

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result?.message || result?.error || "Failed to save reminder");
  }

  return result.data as Reminder;
}
