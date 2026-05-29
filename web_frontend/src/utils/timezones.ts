/** Common IANA timezones for the settings picker */
export const COMMON_TIMEZONES = [
  'Asia/Colombo',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Bangkok',
  'Asia/Jakarta',
  'Australia/Sydney',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Pacific/Auckland',
  'UTC',
] as const;

export function formatTimezoneLabel(tz: string): string {
  return tz.replace(/_/g, ' ');
}
