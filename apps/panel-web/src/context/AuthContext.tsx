import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, type User } from '../lib/api';
import { AUTH_SESSION_EXPIRED, isServiceUnavailable, resetSessionExpiredFlag } from '../lib/api-errors';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  serviceUnavailable: boolean;
  retryConnection: () => Promise<void>;
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
  const [serviceUnavailable, setServiceUnavailable] = useState(false);

  const bootstrapSession = useCallback(async () => {
    setLoading(true);
    setServiceUnavailable(false);
    try {
      const u = await api.me();
      resetSessionExpiredFlag();
      setUser(u);
    } catch (err) {
      if (isServiceUnavailable(err)) {
        setServiceUnavailable(true);
        setUser(null);
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    localStorage.removeItem('spirit_token');
    void bootstrapSession();
  }, [bootstrapSession]);

  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(AUTH_SESSION_EXPIRED, onExpired);
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED, onExpired);
  }, []);

  async function login(identifier: string, password: string, turnstileToken?: string) {
    const res = await api.login(identifier, password, turnstileToken);
    if (res.twoFactorRequired) {
      return { twoFactorRequired: true, challenge: res.challenge };
    }
    if (res.user) {
      resetSessionExpiredFlag();
      setUser(res.user);
    }
    return { twoFactorRequired: false };
  }

  async function completeTwoFactor(challenge: string, code: string) {
    const { user } = await api.loginTwoFactor(challenge, code);
    resetSessionExpiredFlag();
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
    resetSessionExpiredFlag();
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
    <AuthContext.Provider
      value={{
        user,
        loading,
        serviceUnavailable,
        retryConnection: bootstrapSession,
        login,
        completeTwoFactor,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
