
import { apiRequest } from "./client";

export async function getNotificationSettings(token: string) {
  return apiRequest<any>("/api/users/notification-settings", "GET", undefined, token);
}
