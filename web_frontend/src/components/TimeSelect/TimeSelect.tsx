import styles from "./TimeSelect.module.css";
import { formatTime12h, normalizeReminderTime } from "../../utils/reminderTime";

interface TimeSelectProps {
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

function to24h(hour12: number, minute: number, period: "AM" | "PM"): string {
  let h = hour12 % 12;
  if (period === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export default function TimeSelect({ value, onChange }: TimeSelectProps) {
  const { hour12, minute, period } = parse12h(value);

  const update = (nextHour12: number, nextMinute: number, nextPeriod: "AM" | "PM") => {
    onChange(to24h(nextHour12, nextMinute, nextPeriod));
  };

  return (
    <div>
      <div className={styles.row}>
        <select
          className={styles.select}
          aria-label="Hour"
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
