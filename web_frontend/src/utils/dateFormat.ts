export const DEFAULT_TIMEZONE = 'Asia/Colombo';

let displayTimezone = DEFAULT_TIMEZONE;

export function setDisplayTimezone(tz: string) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    displayTimezone = tz;
  } catch {
    displayTimezone = DEFAULT_TIMEZONE;
  }
}

export function getDisplayTimezone(): string {
  return displayTimezone;
}

export function getDetectedTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

function TZ(override?: string): string {
  return override ?? displayTimezone;
}

function toDate(d: Date | string): Date {
  return typeof d === 'string' ? new Date(d) : d;
}

export function formatDate(d: Date | string, tz?: string): string {
  return toDate(d).toLocaleDateString('en-US', { timeZone: TZ(tz), month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(d: Date | string, tz?: string): string {
  return toDate(d).toLocaleString('en-US', {
    timeZone: TZ(tz), weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatDateMedium(d: Date | string, tz?: string): string {
  return toDate(d).toLocaleString('en-US', {
    timeZone: TZ(tz), month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatMonthYear(year: number, month: number, tz?: string): string {
  return new Date(year, month).toLocaleDateString('en-US', { timeZone: TZ(tz), month: 'long', year: 'numeric' });
}

export function formatWeekdayDate(year: number, month: number, day: number, tz?: string): string {
  return new Date(year, month, day).toLocaleDateString('en-US', {
    timeZone: TZ(tz), weekday: 'long', month: 'long', day: 'numeric',
  });
}

/** Current date YYYY-MM-DD in the user's timezone */
export function todayLK(tz?: string): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ(tz) });
}

export function formatTime12h(hhmm: string | null | undefined): string {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return hhmm;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}
