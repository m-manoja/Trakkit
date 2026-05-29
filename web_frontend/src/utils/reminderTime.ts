/** Normalize "HH:MM" or "HH:MM:SS" to "HH:MM". */
export function normalizeReminderTime(time: string | null | undefined): string {
  if (!time || !String(time).trim()) return "08:00";
  const parts = String(time).trim().split(":");
  const h = Math.min(23, Math.max(0, Number(parts[0] ?? 8)));
  const m = Math.min(59, Math.max(0, Number((parts[1] ?? "0").replace(/\D/g, "") || 0)));
  if (Number.isNaN(h) || Number.isNaN(m)) return "08:00";
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Read reminder time from a form — uses DOM value so it stays in sync with the time picker. */
export function readReminderTimeFromForm(form: HTMLFormElement, fallback: string): string {
  const raw = form.elements.namedItem("reminder_time");
  if (raw instanceof HTMLInputElement && raw.value) {
    return normalizeReminderTime(raw.value);
  }
  return normalizeReminderTime(fallback);
}
