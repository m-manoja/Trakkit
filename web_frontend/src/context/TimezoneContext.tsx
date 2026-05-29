import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getNotificationSettings } from '../api/users';
import { setDisplayTimezone, getDetectedTimezone, DEFAULT_TIMEZONE } from '../utils/dateFormat';

type TimezoneContextValue = {
  timezone: string;
  setTimezone: (tz: string) => void;
};

const TimezoneContext = createContext<TimezoneContextValue>({
  timezone: DEFAULT_TIMEZONE,
  setTimezone: () => {},
});

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [timezone, setTimezoneState] = useState(DEFAULT_TIMEZONE);

  useEffect(() => {
    if (!user?.token) {
      setTimezoneState(getDetectedTimezone());
      setDisplayTimezone(getDetectedTimezone());
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const settings = await getNotificationSettings(user.token!);
        const tz = settings?.timezone || getDetectedTimezone();
        if (!cancelled) {
          setTimezoneState(tz);
          setDisplayTimezone(tz);
        }
      } catch {
        const detected = getDetectedTimezone();
        if (!cancelled) {
          setTimezoneState(detected);
          setDisplayTimezone(detected);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [user?.token]);

  const setTimezone = (tz: string) => {
    setTimezoneState(tz);
    setDisplayTimezone(tz);
  };

  return (
    <TimezoneContext.Provider value={{ timezone, setTimezone }}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone() {
  return useContext(TimezoneContext);
}
