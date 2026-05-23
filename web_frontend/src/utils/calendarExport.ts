import type { CalEvent } from '../components/MiniCalendar/MiniCalendar';

function escapeIcs(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function formatIcsDate(dateStr: string): string {
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

/** Download events as .ics for Google Calendar / Apple Calendar import */
export function downloadCalendarIcs(events: CalEvent[], filename = 'trakkit-events.ics'): void {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Trakkit//Premium Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const ev of events) {
    const uid = `${ev.type}-${ev.date}-${ev.label}`.replace(/\s+/g, '-');
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${escapeIcs(uid)}@trakkit.app`);
    lines.push(`DTSTAMP:${formatIcsDate(new Date().toISOString())}T000000Z`);
    lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(ev.date)}`);
    lines.push(`SUMMARY:${escapeIcs(ev.label)}`);
    lines.push(`DESCRIPTION:${escapeIcs(`Trakkit ${ev.type} reminder`)}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
