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

export function formatDateNumeric(d: Date | string, tz?: string): string {
  const date = toDate(d);
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TZ(tz), month: '2-digit', day: '2-digit', year: 'numeric' }).formatToParts(date);
  const p: Record<string, string> = {};
  parts.forEach(({ type, value }) => { p[type] = value; });
  return `${p.month}/${p.day}/${p.year}`;
}

export function formatDateTime(d: Date | string, tz?: string): string {
  return toDate(d).toLocaleString('en-US', {
    timeZone: TZ(tz), weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatShortDate(d: Date | string, tz?: string): string {
  return toDate(d).toLocaleDateString('en-US', { timeZone: TZ(tz), month: 'short', day: 'numeric' });
}

export function formatMonthYear(year: number, month: number, tz?: string): string {
  return new Date(year, month).toLocaleDateString('en-US', { timeZone: TZ(tz), month: 'long', year: 'numeric' });
}

export function formatWeekdayDate(year: number, month: number, day: number, tz?: string): string {
  return new Date(year, month, day).toLocaleDateString('en-US', {
    timeZone: TZ(tz), weekday: 'long', month: 'long', day: 'numeric',
  });
}

export function formatWeekdayFull(d: Date | string, tz?: string): string {
  return toDate(d).toLocaleDateString('en-US', {
    timeZone: TZ(tz), weekday: 'long', month: 'long', day: 'numeric',
  });
}

export function isToday(d: Date | string, tz?: string): boolean {
  const userDate = toDate(d).toLocaleDateString('en-CA', { timeZone: TZ(tz) });
  const now = new Date().toLocaleDateString('en-CA', { timeZone: TZ(tz) });
  return userDate === now;
}

export function isYesterday(d: Date | string, tz?: string): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const userDate = toDate(d).toLocaleDateString('en-CA', { timeZone: TZ(tz) });
  const yest = yesterday.toLocaleDateString('en-CA', { timeZone: TZ(tz) });
  return userDate === yest;
}

export function todayLK(tz?: string): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ(tz) });
}
