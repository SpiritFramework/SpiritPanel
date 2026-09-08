import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { useBranding } from '../context/BrandingContext';
import { AuthError, AuthField, AuthFooter, AuthHeader, AuthLayout, AuthShell } from '../components/AuthLayout';
import { Button } from '../components/Layout';
import { Spinner } from '../components/ui';

export function ResetPasswordPage() {
  const { branding } = useBranding();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  if (!token) return <Navigate to="/login" replace />;

  const minLen = branding.minPasswordLength ?? 8;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < minLen) {
      setError(`Password must be at least ${minLen} characters`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout branding={branding}>
      <AuthShell>
        <AuthHeader
          eyebrow="Account recovery"
          title="Set a new password"
          description="Choose a strong password you don't use elsewhere."
          icon={ShieldCheck}
        />

        {done ? (
          <div className="ds-auth-alert ds-auth-alert--success">
            <CheckCircle2 className="mb-2 h-5 w-5" />
            <p className="font-medium">Password updated</p>
            <p className="mt-1 text-xs opacity-90">Redirecting you to sign in…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="ds-auth-form">
            <AuthField
              label="New password"
              icon={Lock}
              type={show ? 'text' : 'password'}
              value={password}
              onChange={setPassword}
              required
              autoComplete="new-password"
              placeholder={`At least ${minLen} characters`}
              trailing={
                <button
                  type="button"
                  className="ds-auth-input-toggle"
                  onClick={() => setShow((v) => !v)}
                  aria-label="Toggle password visibility"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
            <AuthField
              label="Confirm password"
              icon={Lock}
              type={show ? 'text' : 'password'}
              value={confirm}
              onChange={setConfirm}
              required
              autoComplete="new-password"
              placeholder="Re-enter your password"
            />
            {error && <AuthError message={error} />}
            <Button type="submit" disabled={loading} variant="primary" className="ds-auth-submit">
              {loading ? <Spinner className="h-4 w-4" /> : 'Reset password'}
            </Button>
          </form>
        )}

        <AuthFooter>
          <Link to="/login" className="ds-auth-link">
            Back to sign in
          </Link>
        </AuthFooter>
      </AuthShell>
    </AuthLayout>
  );
}
