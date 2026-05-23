const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface PaymentInitData {
  merchant_id: string;
  order_id: string;
  amount: string;
  currency: string;
  hash: string;
  items: string;
  userId: string;
  notify_url: string;
  return_url: string;
  cancel_url: string;
}

// Call our backend to get the signed payment details
export async function initiatePayment(token: string): Promise<PaymentInitData> {
  const res = await fetch(`${API_BASE}/api/payment/initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to initiate payment');
  }

  return json.data as PaymentInitData;
}

// Check the logged-in user's plan status
export async function getPlanStatus(token: string): Promise<{ plan: string; plan_activated_at: string | null }> {
  const res = await fetch(`${API_BASE}/api/payment/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to fetch plan status');
  }

  return json.data;
}
