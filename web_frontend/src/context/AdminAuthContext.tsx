import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

// Admin auth is intentionally separate from the user AuthContext. It only holds
// an admin-scoped token persisted under its own storage key — there is no link
// to any user account.

type AdminAuthContextType = {
  adminToken: string | null;
  loading: boolean;
  signInAdmin: (token: string) => void;
  signOutAdmin: () => void;
};

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const ADMIN_STORAGE_KEY = "@trakkit_admin_token";

export const AdminAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ADMIN_STORAGE_KEY);
      if (stored) setAdminToken(stored);
    } catch (e) {
      console.error("Failed to load admin session:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const signInAdmin = (token: string) => {
    setAdminToken(token);
    try {
      localStorage.setItem(ADMIN_STORAGE_KEY, token);
    } catch (e) {
      console.error("Failed to persist admin session:", e);
    }
  };

  const signOutAdmin = () => {
    setAdminToken(null);
    try {
      localStorage.removeItem(ADMIN_STORAGE_KEY);
    } catch (e) {
      console.error("Failed to clear admin session:", e);
    }
  };

  return (
    <AdminAuthContext.Provider value={{ adminToken, loading, signInAdmin, signOutAdmin }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return ctx;
};
