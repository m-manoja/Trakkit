import React, {
  createContext,
  useContext,
  useState,
  useEffect,
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
} | null;

type AuthContextType = {
  user: AuthUser;
  setUser: (user: AuthUser) => void;
  signOut: () => void;
  loading: boolean;
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

  // Load persisted session on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        setUserState(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load auth from localStorage:", e);
    } finally {
      setLoading(false);
    }
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

  return (
    <AuthContext.Provider value={{ user, setUser, signOut, loading }}>
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
