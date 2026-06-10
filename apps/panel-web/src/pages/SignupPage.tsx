import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AlertTriangle, Eye, EyeOff, Lock, Mail, User, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { AuthCard, AuthError, AuthField, AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Layout';
import { Spinner } from '../components/ui';
import { TurnstileWidget, resetTurnstileWidget } from '../components/TurnstileWidget';

export function SignupPage() {
  const { user, loading: authLoading, register } = useAuth();
  const { branding } = useBranding();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');

  const maintenanceActive = branding.maintenance.enabled;
  const minPasswordLength = branding.minPasswordLength;
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
    return <Navigate to="/servers" replace />;
  }

  if (!branding.registrationEnabled) {
    return <Navigate to="/login" replace />;
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register({
        email: email.trim(),
        username: username.trim(),
        password,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        turnstileToken: turnstileToken || undefined,
      });
      navigate('/servers');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      setTurnstileToken('');
      resetTurnstileWidget();
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout branding={branding}>
      {maintenanceActive && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Maintenance mode</p>
            <p className="mt-0.5 text-xs text-amber-200/90">
              New sign-ups are paused. {branding.maintenance.message}
            </p>
          </div>
        </div>
      )}

      <AuthCard>
        <div className="mb-6 flex items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-lg"
            style={{ background: brandGradient }}
          >
            <UserPlus className="h-5 w-5" />
          </span>
          <div className="min-w-0 pt-0.5">
            <h2 className="text-lg font-semibold tracking-tight">Create account</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">
              Sign up to deploy and manage your game servers.
            </p>
          </div>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <AuthField
              label="First name"
              icon={User}
              type="text"
              value={firstName}
              onChange={setFirstName}
              autoComplete="given-name"
              placeholder="Jane"
              disabled={maintenanceActive}
            />
            <AuthField
              label="Last name"
              icon={User}
              type="text"
              value={lastName}
              onChange={setLastName}
              autoComplete="family-name"
              placeholder="Doe"
              disabled={maintenanceActive}
            />
          </div>
          <AuthField
            label="Username"
            icon={User}
            type="text"
            value={username}
            onChange={setUsername}
            required
            minLength={3}
            maxLength={32}
            autoComplete="username"
            placeholder="yourname"
            disabled={maintenanceActive}
          />
          <AuthField
            label="Email"
            icon={Mail}
            type="email"
            value={email}
            onChange={setEmail}
            required
            autoComplete="email"
            placeholder="you@example.com"
            disabled={maintenanceActive}
          />
          <AuthField
            label="Password"
            icon={Lock}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={setPassword}
            required
            minLength={minPasswordLength}
            autoComplete="new-password"
            placeholder={`At least ${minPasswordLength} characters`}
            disabled={maintenanceActive}
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

          {error && <AuthError message={error} />}

          {turnstileRequired && !maintenanceActive && (
            <TurnstileWidget
              siteKey={branding.turnstileSiteKey}
              onToken={setTurnstileToken}
              onExpire={() => setTurnstileToken('')}
              className="flex justify-center"
            />
          )}

          <Button
            type="submit"
            disabled={loading || maintenanceActive || (turnstileRequired && !turnstileToken)}
            variant="primary"
            className="w-full rounded-xl py-2.5 text-sm font-semibold shadow-lg shadow-black/25"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Spinner className="h-4 w-4" />
                Creating account…
              </span>
            ) : (
              'Create account'
            )}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-[var(--muted)]">
          Already have an account?{' '}
          <Link to="/login" className="font-medium accent-text transition hover:underline">
            Sign in
          </Link>
        </p>
      </AuthCard>
    </AuthLayout>
  );
}
