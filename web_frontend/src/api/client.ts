import { API_BASE_URL } from "./config";

export async function apiRequest<T>(
  endpoint: string,
  method: string = "GET",
  body?: any,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result?.message || result?.error || "Request failed");
  }

  return result.data as T;
}
