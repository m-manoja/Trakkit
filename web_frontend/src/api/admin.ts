import { API_BASE_URL } from "./config";

export interface AdminUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  plan: string | null;
  plan_activated_at: string | null;
  profile_completed: boolean | null;
  email_verified: boolean | null;
  created_at: string | null;
}

export interface AdminUserDetail extends AdminUser {
  counts: {
    warranties: number;
    subscriptions: number;
    reminders: number;
    todos: number;
  };
}

export interface AdminUsersResult {
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminStats {
  totalUsers: number;
  premiumUsers: number;
  freeUsers: number;
  verifiedUsers: number;
  completedProfiles: number;
  newLast30Days: number;
}

export async function adminLogin(username: string, password: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.token) {
    throw new Error(result?.message || result?.error || "Login failed");
  }
  return result.token as string;
}

async function adminFetch<T>(path: string, token: string, method: string = "GET"): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.message || result?.error || "Request failed");
  }
  return result.data as T;
}

export function fetchAdminStats(token: string): Promise<AdminStats> {
  return adminFetch<AdminStats>("/api/admin/stats", token);
}

export function fetchAdminUsers(
  token: string,
  params: { search?: string; page?: number; pageSize?: number } = {}
): Promise<AdminUsersResult> {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return adminFetch<AdminUsersResult>(`/api/admin/users${suffix}`, token);
}

export function fetchAdminUserDetail(token: string, id: string): Promise<AdminUserDetail> {
  return adminFetch<AdminUserDetail>(`/api/admin/users/${id}`, token);
}

export async function deleteAdminUser(token: string, id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.message || result?.error || "Failed to delete user");
  }
}
