import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, type User } from '../lib/api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string, turnstileToken?: string) => Promise<{ twoFactorRequired: boolean; challenge?: string }>;
  completeTwoFactor: (challenge: string, code: string) => Promise<void>;
  register: (data: {
    email: string;
    username: string;
    password: string;
    firstName?: string;
    lastName?: string;
    turnstileToken?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.removeItem('spirit_token');
    api.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(identifier: string, password: string, turnstileToken?: string) {
    const res = await api.login(identifier, password, turnstileToken);
    if (res.twoFactorRequired) {
      return { twoFactorRequired: true, challenge: res.challenge };
    }
    if (res.user) {
      setUser(res.user);
    }
    return { twoFactorRequired: false };
  }

  async function completeTwoFactor(challenge: string, code: string) {
    const { user } = await api.loginTwoFactor(challenge, code);
    setUser(user);
  }

  async function register(data: {
    email: string;
    username: string;
    password: string;
    firstName?: string;
    lastName?: string;
    turnstileToken?: string;
  }) {
    const { user } = await api.register(data);
    setUser(user);
  }

  async function logout() {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  }

  const refreshUser = useCallback(async () => {
    const updated = await api.me();
    setUser(updated);
    return updated;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, completeTwoFactor, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
