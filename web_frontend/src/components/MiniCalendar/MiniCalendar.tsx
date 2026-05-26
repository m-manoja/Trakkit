import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, CheckCircle, Clock, Bell } from "lucide-react";
import styles from "./MiniCalendar.module.css";

export interface CalEvent {
  date: string;
  type: string;
  label: string;
}

interface MiniCalendarProps {
  events: CalEvent[];
}

const TYPE_COLORS: Record<string, string> = {
  subscription: "var(--primary)", // #B9375D
  warranty: "#F97316",           // Orange
  reminder: "#8B5CF6",           // Purple
  todo: "#10B981",               // Green
};

export default function MiniCalendar({ events }: MiniCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const prevMonth = () => {
    setSelectedDay(null);
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    setSelectedDay(null);
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const weekDays = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  const eventMap = useMemo(() => {
    const map: Record<number, CalEvent[]> = {};
    events.forEach((e) => {
      const d = new Date(e.date);
      if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(e);
      }
    });
    return map;
  }, [events, viewYear, viewMonth]);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const startOffset = (firstDay + 6) % 7; // Adjust for Monday start
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedEvents = selectedDay ? eventMap[selectedDay] || [] : [];
  const selectedDateLabel = selectedDay
    ? new Date(viewYear, viewMonth, selectedDay).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <div className={styles.header}>
        <button onClick={prevMonth} className={styles.navBtn} title="Previous month" aria-label="Previous month">
          <ChevronLeft size={20} />
        </button>
        <h3 className={styles.monthLabel}>{monthLabel}</h3>
        <button onClick={nextMonth} className={styles.navBtn} title="Next month" aria-label="Next month">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Weekdays */}
      <div className={styles.weekDays}>
        {weekDays.map((d) => (
          <div key={d} className={styles.weekDay}>
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className={styles.grid}>
        {cells.map((day, idx) => {
          const isCurrentDay =
            day === today.getDate() &&
            viewMonth === today.getMonth() &&
            viewYear === today.getFullYear();
          const isSelected = day === selectedDay;
          const dayEvents = day ? eventMap[day] : null;
          const types = dayEvents ? [...new Set(dayEvents.map((e) => e.type))] : [];

          return (
            <div
              key={idx}
              className={`${styles.cell} ${day ? styles.cellActive : ""} ${isSelected ? styles.selected : ""}`}
              onClick={() => day && setSelectedDay(day === selectedDay ? null : day)}
            >
              {day && (
                <>
                  <div className={`${styles.dayNum} ${isCurrentDay ? styles.today : ""}`}>
                    {day}
                  </div>
                  {types.length > 0 && (
                    <div className={styles.dots}>
                      {types.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className={styles.dot}
                          data-type={t}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        {Object.entries(TYPE_COLORS).map(([type]) => (
          <div key={type} className={styles.legendItem}>
            <span className={styles.legendDot} data-type={type} />
            <span className={styles.legendLabel}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </span>
          </div>
        ))}
      </div>

      {/* Selected Day Details */}
      {selectedDay && (
        <div className={styles.detailsContainer}>
          <div className={styles.detailsHeader}>
            <h4>{selectedDateLabel}</h4>
            <span className={styles.detailsCount}>
              {selectedEvents.length} event{selectedEvents.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className={styles.detailsList}>
            {selectedEvents.length === 0 ? (
              <p className={styles.noEvents}>Nothing scheduled for this day</p>
            ) : (
              selectedEvents.map((ev, i) => (
                <div key={i} className={styles.eventItem}>
                  <div
                    className={styles.eventIcon}
                    data-type={ev.type}
                  >
                    {ev.type === "warranty" ? <ShieldCheckIcon size={16} /> : 
                     ev.type === "subscription" ? <Clock size={16} /> :
                     ev.type === "todo" ? <CheckCircle size={16} /> : <Bell size={16} />}
                  </div>
                  <div className={styles.eventInfo}>
                    <p className={styles.eventTitle}>{ev.label}</p>
                    <span
                      className={styles.eventType}
                      data-type={ev.type}
                    >
                      {ev.type.charAt(0).toUpperCase() + ev.type.slice(1)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Temporary icon to avoid importing many lucide icons
function ShieldCheckIcon(props: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size} height={props.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  );
}
