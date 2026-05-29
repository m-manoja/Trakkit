export const DEFAULT_TIMEZONE = 'Asia/Colombo';

/** Normalize "HH:MM" or "HH:MM:SS" to "HH:MM". Defaults to 08:00 when empty. */
export function normalizeReminderTime(time: string | null | undefined): string {
  if (!time || !String(time).trim()) return '08:00';
  const parts = String(time).trim().split(':');
  const h = Math.min(23, Math.max(0, Number(parts[0] ?? 8)));
  const m = Math.min(59, Math.max(0, Number((parts[1] ?? '0').replace(/\D/g, '') || 0)));
  if (Number.isNaN(h) || Number.isNaN(m)) return '08:00';
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimezone(tz: string | null | undefined): string {
  if (tz && isValidTimezone(tz)) return tz;
  return DEFAULT_TIMEZONE;
}

type TzParts = { year: number; month: number; day: number; hour: number; minute: number };

function getTzParts(utcDate: Date, timeZone: string): TzParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(utcDate);

  const map: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = parseInt(p.value, 10);
  }
  return {
    year: map.year ?? 0,
    month: map.month ?? 0,
    day: map.day ?? 0,
    hour: map.hour ?? 0,
    minute: map.minute ?? 0,
  };
}

/**
 * UTC instant for a wall-clock date/time in an IANA timezone.
 */
export function zonedDateTimeToUtc(
  dateStr: string,
  timeStr: string,
  timeZone: string
): Date {
  const [yRaw, moRaw, dRaw] = dateStr.split('-');
  const y = Number(yRaw);
  const mo = Number(moRaw);
  const d = Number(dRaw);
  const timeParts = (timeStr || '08:00').split(':');
  const h = Number(timeParts[0] ?? 8);
  const mi = Number(timeParts[1] ?? 0);

  if ([y, mo, d, h, mi].some((n) => Number.isNaN(n))) {
    return new Date();
  }

  let utcMs = Date.UTC(y, mo - 1, d, h, mi, 0, 0);

  for (let i = 0; i < 12; i++) {
    const p = getTzParts(new Date(utcMs), timeZone);
    if (p.year === y && p.month === mo && p.day === d && p.hour === h && p.minute === mi) {
      return new Date(utcMs);
    }
    const dayDiff = d - p.day;
    const monthDiff = mo - p.month;
    const yearDiff = y - p.year;
    const minuteDiff =
      yearDiff * 525600 +
      monthDiff * 43200 +
      dayDiff * 1440 +
      (h - p.hour) * 60 +
      (mi - p.minute);
    utcMs += minuteDiff * 60 * 1000;
  }

  return new Date(utcMs);
}

/** YYYY-MM-DD for a Date's calendar day in the given timezone. */
export function dateToYmdInTz(d: Date, timeZone: string): string {
  return d.toLocaleDateString('en-CA', { timeZone });
}

/** Today's YYYY-MM-DD in the given timezone. */
export function todayYmdInTz(timeZone: string): string {
  return new Date().toLocaleDateString('en-CA', { timeZone });
}

/** YYYY-MM-DD for an ISO timestamp interpreted in the given timezone. */
export function isoToYmdInTz(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone });
}
