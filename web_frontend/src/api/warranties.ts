import { API_BASE_URL } from "./config";
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
  document_url: string;
  status: string;
  reminder_schedule: string;
};

export async function fetchWarranties(userId: string, token: string): Promise<Warranty[]> {
  return apiRequest<Warranty[]>(`/api/warranties/user/${userId}`, "GET", undefined, token);
}

export async function deleteWarranty(id: string, token: string): Promise<void> {
  return apiRequest<void>(`/api/warranties/${id}`, "DELETE", undefined, token);
}

export async function saveWarranty(
  id: string | null,
  formData: FormData,
  token: string
): Promise<Warranty> {
  const endpoint = id ? `/api/warranties/${id}` : "/api/warranties/add";
  const method = id ? "PUT" : "POST";

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 403 && result.error_code === 'DOCUMENT_LIMIT_REACHED') {
       throw result; // throw the whole object to catch in component
    }
    throw new Error(result?.message || result?.error || "Failed to save warranty");
  }

  return result.data as Warranty;
}
