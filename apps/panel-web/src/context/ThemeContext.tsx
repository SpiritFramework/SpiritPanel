import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BRANDING_DEFAULT_THEME_EVENT, BRANDING_THEME_RESOLVED_EVENT } from '../lib/branding-appearance';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  /** The user's stored preference. */
  preference: ThemePreference;
  /** The actual theme applied to the document (system resolved). */
  resolved: ResolvedTheme;
  setPreference: (pref: ThemePreference) => void;
  /** Convenience: cycles light -> dark -> system. */
  cycleTheme: () => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'spirit-theme';
const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'dark';
}

function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function resolveTheme(pref: ThemePreference): ResolvedTheme {
  return pref === 'system' ? systemTheme() : pref;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference);
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(readStoredPreference()));

  const apply = useCallback((pref: ThemePreference) => {
    const next = resolveTheme(pref);
    setResolved(next);
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = next;
      window.dispatchEvent(new CustomEvent(BRANDING_THEME_RESOLVED_EVENT, { detail: next }));
    }
  }, []);

  const setPreference = useCallback(
    (pref: ThemePreference) => {
      setPreferenceState(pref);
      try {
        window.localStorage.setItem(STORAGE_KEY, pref);
      } catch {
        /* ignore */
      }
      apply(pref);
    },
    [apply],
  );

  // Apply on mount.
  useEffect(() => {
    apply(preference);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to system changes when on `system`.
  useEffect(() => {
    if (preference !== 'system' || typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => apply('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [preference, apply]);

  // Apply panel default theme for visitors who have not chosen a preference.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: Event) => {
      if (window.localStorage.getItem(STORAGE_KEY)) return;
      const detail = (event as CustomEvent<ThemePreference>).detail;
      if (detail === 'light' || detail === 'dark' || detail === 'system') {
        setPreferenceState(detail);
        apply(detail);
      }
    };
    window.addEventListener(BRANDING_DEFAULT_THEME_EVENT, handler);
    return () => window.removeEventListener(BRANDING_DEFAULT_THEME_EVENT, handler);
  }, [apply]);

  const cycleTheme = useCallback(() => {
    const order: ThemePreference[] = ['light', 'dark', 'system'];
    const idx = order.indexOf(preference);
    setPreference(order[(idx + 1) % order.length]);
  }, [preference, setPreference]);

  const toggleTheme = useCallback(() => {
    setPreference(resolved === 'dark' ? 'light' : 'dark');
  }, [resolved, setPreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolved, setPreference, cycleTheme, toggleTheme }),
    [preference, resolved, setPreference, cycleTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
