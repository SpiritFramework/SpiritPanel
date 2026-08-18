import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Eye, EyeOff, Lock, LogIn, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isStaffOrPanelAdmin } from '../lib/roles';
import { useBranding } from '../context/BrandingContext';
import { AuthCard, AuthError, AuthField, AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Layout';
import { Spinner } from '../components/ui';
import { TurnstileWidget, resetTurnstileWidget } from '../components/TurnstileWidget';

export function LoginPage() {
  const { user, loading: authLoading, login, completeTwoFactor, refreshUser } = useAuth();
  const { branding } = useBranding();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState('');
  const [code, setCode] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');

  const maintenanceActive = branding.maintenance.enabled;
  const turnstileRequired = branding.turnstileEnabled && Boolean(branding.turnstileSiteKey);

  const brandGradient = useMemo(
    () =>
      `linear-gradient(135deg, ${branding.accentColor} 0%, ${branding.secondaryColor || branding.accentColor} 100%)`,
    [branding.accentColor, branding.secondaryColor],
  );

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--muted)]">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (user) {
    return <Navigate to={isStaffOrPanelAdmin(user) ? '/admin' : '/servers'} replace />;
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
        navigate(isStaffOrPanelAdmin(me) ? '/admin' : '/servers');
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
      navigate(isStaffOrPanelAdmin(me) ? '/admin' : '/servers');
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
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Maintenance mode</p>
            <p className="mt-0.5 text-xs text-amber-200/90">{branding.maintenance.message}</p>
          </div>
        </div>
      )}

      <AuthCard>
        {challenge ? (
          <>
            <div className="mb-6 flex items-start gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-lg"
                style={{ background: brandGradient }}
              >
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div className="min-w-0 pt-0.5">
                <h2 className="text-lg font-semibold tracking-tight">Two-factor authentication</h2>
                <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">
                  Enter the 6-digit code from your authenticator app, or a recovery code.
                </p>
              </div>
            </div>

            <form onSubmit={handleTwoFactor} className="space-y-4">
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
              <Button
                type="submit"
                disabled={loading || !code.trim()}
                variant="primary"
                className="w-full rounded-xl py-2.5 text-sm font-semibold shadow-lg shadow-black/25"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Spinner className="h-4 w-4" />
                    Verifying…
                  </span>
                ) : (
                  'Verify & sign in'
                )}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-[var(--muted)]">
              <button
                type="button"
                onClick={cancelTwoFactor}
                className="inline-flex items-center gap-1 font-medium accent-text transition hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
              </button>
            </p>
          </>
        ) : (
          <>
        <div className="mb-6 flex items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-lg"
            style={{ background: brandGradient }}
          >
            <LogIn className="h-5 w-5" />
          </span>
          <div className="min-w-0 pt-0.5">
            <h2 className="text-lg font-semibold tracking-tight">Sign in</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">
              Use your username or email to access the panel.
            </p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
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
                className="auth-field-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />

          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-xs font-medium accent-text transition hover:underline">
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
            className="w-full rounded-xl py-2.5 text-sm font-semibold shadow-lg shadow-black/25"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Spinner className="h-4 w-4" />
                Signing in…
              </span>
            ) : (
              'Sign in'
            )}
          </Button>
        </form>

        {branding.registrationEnabled && (
          <p className="mt-5 text-center text-sm text-[var(--muted)]">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="font-medium accent-text transition hover:underline">
              Sign up
            </Link>
          </p>
        )}
          </>
        )}
      </AuthCard>
    </AuthLayout>
  );
}
