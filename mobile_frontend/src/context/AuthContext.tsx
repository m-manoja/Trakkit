import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../api/config';

export type User = {
  id: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  name?: string;
  token: string;
  plan?: 'free' | 'premium';
  profileCompleted?: boolean;
  emailVerified?: boolean;
} | null;

type AuthContextType = {
  user: User;
  setUser: (user: User) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
  refreshPlan: () => Promise<'free' | 'premium' | null>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const AUTH_STORAGE_KEY = '@auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<User>(null);
  userRef.current = user;

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        const savedUser = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (!savedUser) return;

        const parsed: User = JSON.parse(savedUser);
        if (cancelled) return;
        setUserState(parsed);

        if (!parsed?.token) return;

        try {
          const res = await fetch(`${API_BASE_URL}/api/payment/status`, {
            cache: 'no-store',
            headers: { Authorization: `Bearer ${parsed.token}` },
          });
          const json = await res.json();
          if (!cancelled && json.success && json.data?.plan) {
            const plan: 'free' | 'premium' = json.data.plan === 'premium' ? 'premium' : 'free';
            const next = { ...parsed, plan };
            setUserState(next);
            await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
          }
        } catch (planErr) {
          // User session is still valid — only plan sync failed (backend unreachable)
          console.warn(
            `Could not sync plan from ${API_BASE_URL}. Is the backend running on your LAN IP?`,
            planErr
          );
        }
      } catch (e) {
        console.error('Failed to load user from storage:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const setUser = async (newUser: User) => {
    setUserState(newUser);
    try {
      if (newUser) {
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
      } else {
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to save user to storage:', e);
    }
  };

  async function signOut() {
    await setUser(null);
  }

  const refreshPlan = useCallback(async (): Promise<'free' | 'premium' | null> => {
    const current = userRef.current;
    if (!current?.token) return null;

    try {
      const res = await fetch(`${API_BASE_URL}/api/payment/status`, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${current.token}` },
      });
      const json = await res.json();
      if (json.success && json.data?.plan) {
        const plan: 'free' | 'premium' = json.data.plan === 'premium' ? 'premium' : 'free';
        const next = { ...current, plan };
        setUserState(next);
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
        return plan;
      }
    } catch (e) {
      console.error('Failed to refresh plan:', e);
    }

    return current.plan ?? null;
  }, []);

  useEffect(() => {
    const onAppStateChange = (state: AppStateStatus) => {
      if (state === 'active' && userRef.current?.token) {
        refreshPlan();
      }
    };

    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, [refreshPlan]);

  return (
    <AuthContext.Provider value={{ user, setUser, signOut, loading, refreshPlan }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
