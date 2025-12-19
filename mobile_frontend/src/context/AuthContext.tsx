// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../api/supabase";

type User = { id: string; phone: string } | null;

type AuthContextType = {
  user: User;
  setUser: (user: User) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: { id: string; phone?: string } | null } }) => {
      if (data.user) setUser({ id: data.user.id, phone: data.user.phone ?? "" });
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event: any, session: { user: { id: any; phone: any; }; }) => {
      setUser(session?.user ? { id: session.user.id, phone: session.user.phone ?? "" } : null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, setUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
