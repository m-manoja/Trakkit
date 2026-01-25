import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Blueprint for the User Object
export type User = {
  id: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  token: string;
} | null;

// 2. Blueprint for the Context State
type AuthContextType = {
  user: User;
  setUser: (user: User) => Promise<void>; // Added Promise<void> because it's async
  signOut: () => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  // Load user from storage on app start
  useEffect(() => {
    const loadUser = async () => {
      try {
        const savedUser = await AsyncStorage.getItem('@auth_user');
        if (savedUser) {
          setUserState(JSON.parse(savedUser));
        }
      } catch (e) {
        console.error("Failed to load user from storage:", e);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  // 3. The logic that saves the login to the phone's disk
  const setUser = async (newUser: User) => {
    setUserState(newUser);
    try {
      if (newUser) {
        await AsyncStorage.setItem('@auth_user', JSON.stringify(newUser));
      } else {
        await AsyncStorage.removeItem('@auth_user');
      }
    } catch (e) {
      console.error("Failed to save user to storage:", e);
    }
  };

  async function signOut() {
    await setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, setUser, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};