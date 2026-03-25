import { API_BASE_URL } from "./config";

type ProfilePayload = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  dob?: string;
};

export async function getProfile(userId: string, token?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/api/users/profile?userId=${userId}`, {
    method: "GET",
    headers,
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result?.error || "Profile fetch failed");
  }

  return result;
}


export async function updateProfile(payload: ProfilePayload) {
  const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result?.error || "Profile update failed");
  }

  return true;
}

export async function initiatePhoneChange(newPhone: string, token: string) {
  const response = await fetch(`${API_BASE_URL}/api/users/change-phone/initiate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ newPhone }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result?.error || "Failed to send OTP");
  }

  return result;
}

export async function verifyPhoneChange(newPhone: string, otp: string, token: string) {
  const response = await fetch(`${API_BASE_URL}/api/users/change-phone/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ newPhone, otp }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result?.error || "Verification failed");
  }

  return result; // { user, token }
}

export async function uploadProfileImage(imageUri: string, mimeType: string, token: string) {
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    type: mimeType,
    name: `profile.${mimeType.split('/')[1] || 'jpg'}`,
  } as any);

  const response = await fetch(`${API_BASE_URL}/api/users/profile-image`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      // Do NOT set Content-Type here — let fetch set multipart boundary automatically
    },
    body: formData,
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result?.error || "Image upload failed");
  }

  return result; // { profileImageUrl }
}

export async function getNotificationSettings(token: string) {
  const response = await fetch(`${API_BASE_URL}/api/users/notification-settings`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error || "Failed to fetch notification settings");
  return result;
}

export async function updateNotificationSettings(payload: { email_notification: boolean, sms_notification: boolean, push_notification: boolean, reminder_schedule: string }, token: string) {
  const response = await fetch(`${API_BASE_URL}/api/users/notification-settings`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error || "Failed to update notification settings");
  return result;
}
