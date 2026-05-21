"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   Authentification simulée (mock). Aucun backend : la session est stockée
   dans le localStorage. À remplacer par une vraie auth (NextAuth, JWT…).
   ───────────────────────────────────────────────────────────────────────────── */

export interface AdminUser {
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isReady: boolean;
  signIn: (email: string, password: string) => { ok: boolean; error?: string };
  signOut: () => void;
}

const STORAGE_KEY = "labsfood-admin-session";

const DEMO_USER: AdminUser = {
  name: "Ivy Siyaptze",
  email: "admin@labsfood.fr",
  role: "Administratrice",
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setUser(JSON.parse(raw) as AdminUser);
    } catch {
      /* localStorage indisponible — on ignore */
    }
    setIsReady(true);
  }, []);

  const signIn = (email: string, password: string) => {
    // Mock : on accepte n'importe quel email/mot de passe non vides.
    if (!email.trim() || !password.trim()) {
      return { ok: false, error: "Renseigne ton email et ton mot de passe." };
    }
    const next: AdminUser = { ...DEMO_USER, email: email.trim() };
    setUser(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    return { ok: true };
  };

  const signOut = () => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isReady,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return ctx;
}
