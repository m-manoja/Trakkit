import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type AuthUser = {
  id: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profilePicture?: string;
  token: string;
  plan?: 'free' | 'premium';
} | null;

type AuthContextType = {
  user: AuthUser;
  setUser: (user: AuthUser) => void;
  signOut: () => void;
  loading: boolean;
  refreshPlan: () => Promise<'free' | 'premium' | null>;
};

// ─── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = "@trakkit_auth_user";

// ─── Provider ──────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUserState] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<AuthUser>(null);
  userRef.current = user;

  // Load persisted session on mount, then sync plan from server
  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (!stored) return;

        const parsed: AuthUser = JSON.parse(stored);
        if (cancelled) return;
        setUserState(parsed);

        if (!parsed?.token) return;

        const res = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/payment/status`,
          { cache: 'no-store', headers: { Authorization: `Bearer ${parsed.token}` } }
        );
        const json = await res.json();
        if (!cancelled && json.success && json.data?.plan) {
          setUserState({ ...parsed, plan: json.data.plan });
          localStorage.setItem(
            AUTH_STORAGE_KEY,
            JSON.stringify({ ...parsed, plan: json.data.plan })
          );
        }
      } catch (e) {
        console.error("Failed to load auth from localStorage:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const setUser = (newUser: AuthUser) => {
    setUserState(newUser);
    try {
      if (newUser) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (e) {
      console.error("Failed to persist auth to localStorage:", e);
    }
  };

  const signOut = () => setUser(null);

  // Called after a successful payment to refresh the plan from the server
  const refreshPlan = useCallback(async (): Promise<'free' | 'premium' | null> => {
    const current = userRef.current;
    if (!current?.token) return null;

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/payment/status`,
        { cache: 'no-store', headers: { Authorization: `Bearer ${current.token}` } }
      );
      const json = await res.json();
      if (json.success && json.data?.plan) {
        const plan = json.data.plan === 'premium' ? 'premium' : 'free';
        const next = { ...current, plan };
        setUserState(next);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
        return plan;
      }
    } catch (e) {
      console.error('Failed to refresh plan:', e);
    }

    return current.plan ?? null;
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, signOut, loading, refreshPlan }}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ──────────────────────────────────────────────────────────────────────

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
