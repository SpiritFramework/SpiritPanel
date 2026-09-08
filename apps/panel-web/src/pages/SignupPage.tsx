import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
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
        <AuthMaintenanceBanner
          title="Maintenance mode"
          message={`New sign-ups are paused. ${branding.maintenance.message}`}
        />
      )}

      <AuthTabs active="signup" registrationEnabled={branding.registrationEnabled} />

      <AuthShell>
        <AuthHeader
          eyebrow="Get started"
          title="Create your account"
          description="Sign up to deploy and manage your game servers."
          icon={UserPlus}
        />

        <form onSubmit={handleRegister} className="ds-auth-form">
          <div className="ds-auth-field-grid ds-auth-field-grid--2">
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
                className="ds-auth-input-toggle"
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
            className="ds-auth-submit"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner className="h-4 w-4" />
                Creating account…
              </span>
            ) : (
              'Create account'
            )}
          </Button>
        </form>

        <AuthFooter>
          Already have an account?{' '}
          <Link to="/login" className="ds-auth-link">
            Sign in
          </Link>
        </AuthFooter>
      </AuthShell>
    </AuthLayout>
  );
}
