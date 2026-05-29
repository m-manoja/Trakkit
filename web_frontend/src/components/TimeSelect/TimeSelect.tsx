import styles from "./TimeSelect.module.css";
import { formatTime12h, normalizeReminderTime } from "../../utils/reminderTime";

interface TimeSelectProps {
  selectId: string;
  value: string;
  onChange: (value: string) => void;
}

function parse12h(value: string) {
  const normalized = normalizeReminderTime(value);
  const [hStr, mStr] = normalized.split(":");
  const h24 = Number(hStr);
  const minute = Number(mStr);
  const period: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
  const hour12 = h24 % 12 || 12;
  return { hour12, minute, period };
}

export function to24hFromParts(hour12: number, minute: number, period: "AM" | "PM"): string {
  let h = hour12 % 12;
  if (period === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Read the time directly from the dropdown elements — cannot be lost by React state. */
export function readTimeFromSelects(selectId: string): string | null {
  const root = document.getElementById(selectId);
  if (!root) return null;

  const hourEl = root.querySelector<HTMLSelectElement>('[data-time-part="hour"]');
  const minuteEl = root.querySelector<HTMLSelectElement>('[data-time-part="minute"]');
  const periodEl = root.querySelector<HTMLSelectElement>('[data-time-part="period"]');

  if (!hourEl || !minuteEl || !periodEl) return null;

  const hour12 = Number(hourEl.value);
  const minute = Number(minuteEl.value);
  const period = periodEl.value as "AM" | "PM";

  if (Number.isNaN(hour12) || Number.isNaN(minute) || (period !== "AM" && period !== "PM")) {
    return null;
  }

  return to24hFromParts(hour12, minute, period);
}

export default function TimeSelect({ selectId, value, onChange }: TimeSelectProps) {
  const { hour12, minute, period } = parse12h(value);

  const update = (nextHour12: number, nextMinute: number, nextPeriod: "AM" | "PM") => {
    onChange(to24hFromParts(nextHour12, nextMinute, nextPeriod));
  };

  return (
    <div id={selectId}>
      <div className={styles.row}>
        <select
          className={styles.select}
          aria-label="Hour"
          data-time-part="hour"
          value={hour12}
          onChange={(e) => update(Number(e.target.value), minute, period)}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <span>:</span>
        <select
          className={styles.select}
          aria-label="Minute"
          data-time-part="minute"
          value={minute}
          onChange={(e) => update(hour12, Number(e.target.value), period)}
        >
          {Array.from({ length: 60 }, (_, i) => i).map((m) => (
            <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
          ))}
        </select>
        <select
          className={styles.select}
          aria-label="AM or PM"
          data-time-part="period"
          value={period}
          onChange={(e) => update(hour12, minute, e.target.value as "AM" | "PM")}
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
      <p className={styles.preview}>
        Reminder at <strong>{formatTime12h(normalizeReminderTime(value))}</strong>
      </p>
    </div>
  );
}
