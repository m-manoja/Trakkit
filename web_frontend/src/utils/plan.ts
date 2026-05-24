export type UserPlan = "free" | "premium";

export function normalizePlan(value: unknown): UserPlan {
  return value === "premium" ? "premium" : "free";
}
