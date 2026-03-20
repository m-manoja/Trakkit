import { API_BASE_URL } from "./config";

type ProfilePayload = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  dob?: string;
};

export async function getProfile(userId: string) {
  const response = await fetch(`${API_BASE_URL}/api/users/profile?userId=${userId}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
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
