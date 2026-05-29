/** Normalize "HH:MM" or "HH:MM:SS" to "HH:MM". */
export function normalizeReminderTime(time: string | null | undefined): string {
  if (!time || !String(time).trim()) return "08:00";
  const parts = String(time).trim().split(":");
  const h = Math.min(23, Math.max(0, Number(parts[0] ?? 8)));
  const m = Math.min(59, Math.max(0, Number((parts[1] ?? "0").replace(/\D/g, "") || 0)));
  if (Number.isNaN(h) || Number.isNaN(m)) return "08:00";
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatTime12h(hhmm: string | null | undefined): string {
  const normalized = normalizeReminderTime(hhmm);
  const [h, m] = normalized.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return normalized;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}
