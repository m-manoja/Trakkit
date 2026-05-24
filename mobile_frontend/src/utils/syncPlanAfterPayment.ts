/** Poll plan status after web checkout — webhook activation can take a few seconds. */
export async function syncPlanAfterPayment(
  refreshPlan: () => Promise<'free' | 'premium' | null>,
  options?: { maxAttempts?: number; delayMs?: number }
): Promise<'free' | 'premium' | null> {
  const maxAttempts = options?.maxAttempts ?? 8;
  const delayMs = options?.delayMs ?? 1500;

  let lastPlan: 'free' | 'premium' | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    lastPlan = await refreshPlan();
    if (lastPlan === 'premium') return 'premium';
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return lastPlan;
}
