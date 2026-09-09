import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Lock, LogIn, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isStaffOrPanelAdmin } from '../lib/roles';
import { resolvePostAuthPath } from '../lib/post-auth-path';
import { useBranding } from '../context/BrandingContext';
import {
  AuthError,
  AuthField,
  AuthFooter,
  AuthHeader,
  AuthLayout,
  AuthMaintenanceBanner,
  AuthShell,
  AuthTabs,
} from '../components/AuthLayout';
import { Button } from '../components/Layout';
import { Spinner } from '../components/ui';
import { TurnstileWidget, resetTurnstileWidget } from '../components/TurnstileWidget';
import { DiscordIcon } from '../components/icons/DiscordIcon';

export function LoginPage() {
  const { user, loading: authLoading, login, completeTwoFactor, refreshUser } = useAuth();
  const { branding } = useBranding();
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState('');
  const [code, setCode] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [searchParams] = useSearchParams();

  const maintenanceActive = branding.maintenance.enabled;
  const turnstileRequired = branding.turnstileEnabled && Boolean(branding.turnstileSiteKey);

  function defaultHome(me: Parameters<typeof isStaffOrPanelAdmin>[0]) {
    return isStaffOrPanelAdmin(me) ? '/admin' : '/servers';
  }

  function redirectAfterAuth(me: Parameters<typeof isStaffOrPanelAdmin>[0]) {
    navigate(resolvePostAuthPath((location.state as { from?: string } | null)?.from, defaultHome(me)));
  }

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#discord2fa=')) {
      const token = decodeURIComponent(hash.slice('#discord2fa='.length));
      if (token) {
        setChallenge(token);
        history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      }
    }
  }, []);

  useEffect(() => {
    const code = searchParams.get('discord_error');
    if (!code) return;
    const messages: Record<string, string> = {
      not_linked: 'No panel account is linked to this Discord. Sign in with your password, then link Discord in Security.',
      denied: 'Discord sign-in was cancelled.',
      failed: 'Discord sign-in failed. Please try again.',
      disabled: 'Discord login is not enabled on this panel.',
      suspended: 'Your account has been suspended. Please contact an administrator.',
      maintenance: branding.maintenance.message || 'The panel is temporarily down for maintenance.',
    };
    setError(messages[code] ?? 'Discord sign-in failed. Please try again.');
  }, [branding.maintenance.message, searchParams]);

  if (authLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center text-[var(--muted)]">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (user) {
    return (
      <Navigate
        to={resolvePostAuthPath((location.state as { from?: string } | null)?.from, defaultHome(user))}
        replace
      />
    );
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await login(identifier.trim(), password, turnstileToken || undefined);
      if (res.twoFactorRequired && res.challenge) {
        setChallenge(res.challenge);
      } else {
        const me = await refreshUser();
        redirectAfterAuth(me);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setTurnstileToken('');
      resetTurnstileWidget();
    } finally {
      setLoading(false);
    }
  }

  async function handleTwoFactor(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await completeTwoFactor(challenge, code.trim());
      const me = await refreshUser();
      redirectAfterAuth(me);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  function cancelTwoFactor() {
    setChallenge('');
    setCode('');
    setError('');
  }

  return (
    <AuthLayout branding={branding}>
      {maintenanceActive && (
        <AuthMaintenanceBanner
          title="Maintenance mode"
          message={branding.maintenance.message}
        />
      )}

      <AuthTabs active="login" registrationEnabled={branding.registrationEnabled} />

      <AuthShell>
        {challenge ? (
          <>
            <AuthHeader
              eyebrow="Security"
              title="Two-factor authentication"
              description="Enter the 6-digit code from your authenticator app, or a recovery code."
              icon={ShieldCheck}
            />

            <form onSubmit={handleTwoFactor} className="ds-auth-form">
              <AuthField
                label="Authentication code"
                icon={ShieldCheck}
                type="text"
                value={code}
                onChange={setCode}
                required
                autoComplete="one-time-code"
                placeholder="123456"
              />
              {error && <AuthError message={error} />}
              <Button type="submit" disabled={loading || !code.trim()} variant="primary" className="ds-auth-submit">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner className="h-4 w-4" />
                    Verifying…
                  </span>
                ) : (
                  'Verify and sign in'
                )}
              </Button>
            </form>

            <AuthFooter>
              <button type="button" onClick={cancelTwoFactor} className="ds-auth-link-btn">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </button>
            </AuthFooter>
          </>
        ) : (
          <>
            <AuthHeader
              eyebrow="Welcome back"
              title="Sign in to your account"
              description="Use your username or email to access the panel."
              icon={LogIn}
            />

            <form onSubmit={handleLogin} className="ds-auth-form">
              <AuthField
                label="Username or email"
                icon={User}
                type="text"
                value={identifier}
                onChange={setIdentifier}
                required
                autoComplete="username"
                placeholder="username or you@example.com"
              />
              <AuthField
                label="Password"
                icon={Lock}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={setPassword}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                trailing={
                  <button
                    type="button"
                    className="ds-auth-input-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />

              <div className="ds-auth-row">
                <span />
                <Link to="/forgot-password" className="ds-auth-link">
                  Forgot password?
                </Link>
              </div>

              {error && <AuthError message={error} />}

              {turnstileRequired && (
                <TurnstileWidget
                  siteKey={branding.turnstileSiteKey}
                  onToken={setTurnstileToken}
                  onExpire={() => setTurnstileToken('')}
                  className="flex justify-center"
                />
              )}

              <Button
                type="submit"
                disabled={loading || (turnstileRequired && !turnstileToken)}
                variant="primary"
                className="ds-auth-submit"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner className="h-4 w-4" />
                    Signing in…
                  </span>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>

            {branding.discordLoginEnabled ? (
              <div className="mt-5">
                <div className="mb-4 flex items-center gap-3 text-[11px] uppercase tracking-wide text-[var(--muted)]">
                  <span className="h-px flex-1 bg-[var(--border)]" />
                  or
                  <span className="h-px flex-1 bg-[var(--border)]" />
                </div>
                <a
                  href="/api/auth/discord/start?intent=login"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                  style={{ background: '#5865F2' }}
                >
                  <DiscordIcon className="h-4 w-4" />
                  Continue with Discord
                </a>
              </div>
            ) : null}

            {branding.registrationEnabled && (
              <AuthFooter>
                Don&apos;t have an account?{' '}
                <Link to="/signup" className="ds-auth-link">
                  Create one
                </Link>
              </AuthFooter>
            )}
          </>
        )}
      </AuthShell>
    </AuthLayout>
  );
}
