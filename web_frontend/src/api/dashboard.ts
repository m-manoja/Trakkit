import { apiRequest } from "./client";

export type Warranty = {
  id: string;
  product_name: string;
  purchase_place: string;
  purchase_date: string;
  expiry_date: string;
  warranty_period: string;
  category: string;
  description: string;
  status: string;
};

export type Subscription = {
  id: string;
  service_name: string;
  amount: number;
  billing_cycle: string;
  next_billing_date: string;
  category: string;
  manage_url?: string | null;
};

export type Todo = {
  id: string;
  task_name: string;
  is_completed: boolean;
  has_reminder: boolean;
  reminder_date: string | null;
  reminder_time: string | null;
};

export type Reminder = {
  id: string;
  title: string;
  type: string;
  reminder_date: string;
};

export async function fetchWarranties(userId: string, token: string): Promise<Warranty[]> {
  return apiRequest<Warranty[]>(`/api/warranties/user/${userId}`, "GET", undefined, token);
}

export async function fetchSubscriptions(userId: string, token: string): Promise<Subscription[]> {
  return apiRequest<Subscription[]>(`/api/subscriptions/user/${userId}`, "GET", undefined, token);
}

export async function fetchTodos(token: string): Promise<Todo[]> {
  return apiRequest<Todo[]>("/api/todos", "GET", undefined, token);
}

export async function fetchReminders(userId: string, token: string): Promise<Reminder[]> {
  return apiRequest<Reminder[]>(`/api/reminders/user/${userId}`, "GET", undefined, token);
}
