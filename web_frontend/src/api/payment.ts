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
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to fetch plan status');
  }

  return json.data;
}

export interface PremiumUsage {
  plan: string;
  plan_activated_at: string | null;
  document_count: number;
  document_limit: number | null;
  is_premium: boolean;
}

export async function getPremiumUsage(token: string): Promise<PremiumUsage> {
  const res = await fetch(`${API_BASE}/api/payment/usage`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to fetch usage');
  }

  return json.data;
}

export interface PayHereReturnParams {
  order_id?: string;
  payment_id?: string;
  payhere_amount?: string;
  payhere_currency?: string;
  status_code?: string;
  md5sig?: string;
  merchant_id?: string;
}

export async function completePayment(
  token: string,
  params: PayHereReturnParams
): Promise<{ plan: string; upgraded: boolean }> {
  const res = await fetch(`${API_BASE}/api/payment/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to confirm payment');
  }

  return json.data;
}

/** After PayHere redirects back (return URL has no signed params). */
export async function activateCheckout(
  token: string,
  orderId: string
): Promise<{ plan: string; upgraded: boolean }> {
  const res = await fetch(`${API_BASE}/api/payment/activate`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ order_id: orderId }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to activate Premium');
  }

  return json.data;
}
