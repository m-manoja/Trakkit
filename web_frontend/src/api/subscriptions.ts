import { API_BASE_URL } from "./config";
import { apiRequest } from "./client";

export interface Subscription {
  id: string;
  service_name: string;
  amount: number;
  billing_cycle: string;
  category: string;
  start_date: string;
  next_billing_date?: string;
  status?: string;
  description?: string;
  reminder_schedule?: string;
}

export async function fetchSubscriptions(userId: string, token: string): Promise<Subscription[]> {
  return apiRequest<Subscription[]>(`/api/subscriptions/user/${userId}`, "GET", undefined, token);
}

export async function deleteSubscription(id: string, token: string): Promise<void> {
  return apiRequest<void>(`/api/subscriptions/${id}`, "DELETE", undefined, token);
}

export async function saveSubscription(
  id: string | null,
  data: any,
  token: string
): Promise<Subscription> {
  const endpoint = id ? `/api/subscriptions/${id}` : "/api/subscriptions/add";
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
    throw new Error(result?.message || result?.error || "Failed to save subscription");
  }

  return result.data as Subscription;
}

export async function renewSubscription(id: string, token: string): Promise<Subscription> {
  return apiRequest<Subscription>(`/api/subscriptions/${id}/renew`, "PUT", undefined, token);
}
