import { API_BASE_URL } from "./config";
import { apiRequest } from "./client";

export interface Todo {
  id: string;
  task_name: string;
  is_completed: boolean;
  has_reminder: boolean;
  reminder_date: string | null;
  reminder_schedule: string | null;
}

export async function fetchTodos(userId: string, token: string): Promise<Todo[]> {
  return apiRequest<Todo[]>(`/api/todos/user/${userId}`, "GET", undefined, token);
}

export async function deleteTodo(id: string, token: string): Promise<void> {
  return apiRequest<void>(`/api/todos/${id}`, "DELETE", undefined, token);
}

export async function toggleTodo(id: string, token: string): Promise<void> {
  return apiRequest<void>(`/api/todos/${id}/toggle`, "PUT", undefined, token);
}

export async function saveTodo(
  id: string | null,
  data: any,
  token: string
): Promise<Todo> {
  const endpoint = id ? `/api/todos/${id}` : "/api/todos/add";
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
    throw new Error(result?.message || result?.error || "Failed to save task");
  }

  return result.data as Todo;
}
