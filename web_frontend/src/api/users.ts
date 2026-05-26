import { apiRequest } from "./client";

export interface UserProfile {
  id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  dob?: string;
  profile_picture?: string;
}

export interface NotificationSettings {
  email_notification: boolean;
  sms_notification: boolean;
  push_notification: boolean;
  reminder_schedule: string;
}

export async function getProfile(token: string): Promise<UserProfile> {
  const result = await apiRequest<UserProfile>("/api/users/profile", "GET", undefined, token);
  // the client.ts returns result.data which might be what we need, but let's check profile controller in backend.
  // getProfile returns { success: true, data: profile }
  // wait, apiRequest extracts `result.data`. So it returns `UserProfile` directly!
  return result as UserProfile;
}

export async function updateProfile(data: { userId: string, firstName: string, lastName: string, email: string, dob?: string }, token: string) {
  // updateProfile in backend returns { message: "Profile updated" } without data object, wait.
  // We need to use fetch directly or understand apiRequest. 
  // Wait, if backend returns { message: "Profile updated" }, `apiRequest` will return undefined since `data` is missing?
  // Let's just use fetch if we need the message, or let apiRequest return undefined.
  const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users/profile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  const res = await response.json();
  if (!response.ok) throw new Error(res.error || "Failed to update profile");
  return res;
}

export async function getNotificationSettings(token: string): Promise<NotificationSettings> {
  const result = await apiRequest<NotificationSettings>("/api/users/notification-settings", "GET", undefined, token);
  return result;
}

export async function updateNotificationSettings(data: NotificationSettings, token: string): Promise<NotificationSettings> {
  const result = await apiRequest<NotificationSettings>("/api/users/notification-settings", "PUT", data, token);
  return result;
}

export async function initiatePhoneChange(newPhone: string, token: string) {
  const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users/change-phone/initiate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ newPhone })
  });
  const res = await response.json();
  if (!response.ok) throw new Error(res.error || "Failed to send OTP");
  return res;
}

export async function verifyPhoneChange(newPhone: string, otp: string, token: string) {
  const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users/change-phone/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ newPhone, otp })
  });
  const res = await response.json();
  if (!response.ok) throw new Error(res.error || "Verification failed");
  return res;
}

export async function uploadProfileImage(file: File, token: string): Promise<{ profile_picture: string }> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users/profile-image`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`
    },
    body: formData
  });
  const res = await response.json();
  if (!response.ok) throw new Error(res.error || "Failed to upload profile image");
  return { profile_picture: res.profileImageUrl };
}

export async function setBackupPassword(email: string, password: string, token: string) {
  const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users/backup-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ email, password })
  });
  const res = await response.json();
  if (!response.ok) throw new Error(res.error || "Failed to set backup password");
  return res;
}

export async function dismissBackupPrompt(token: string) {
  const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users/backup-password/dismiss`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });
  const res = await response.json();
  if (!response.ok) throw new Error(res.error || "Failed to dismiss prompt");
  return res;
}
