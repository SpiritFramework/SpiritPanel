import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { useBranding } from '../context/BrandingContext';
import { AuthCard, AuthError, AuthField, AuthLayout } from '../components/AuthLayout';
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
      <AuthCard>
        <div className="mb-6 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl accent-bg text-white shadow-lg">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0 pt-0.5">
            <h2 className="text-lg font-semibold tracking-tight">Set a new password</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">Choose a strong password you don&apos;t use elsewhere.</p>
          </div>
        </div>

        {done ? (
          <div className="rounded-xl border border-[var(--success-border)] bg-[var(--success-bg)] px-4 py-4 text-sm" style={{ color: 'var(--success-fg)' }}>
            <CheckCircle2 className="mb-2 h-5 w-5" />
            <p className="font-medium">Password updated</p>
            <p className="mt-1 text-xs opacity-90">Redirecting you to sign in…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <AuthField
              label="New password"
              icon={Lock}
              type={show ? 'text' : 'password'}
              value={password}
              onChange={setPassword}
              required
              autoComplete="new-password"
              placeholder="At least 8 characters"
              trailing={
                <button type="button" className="auth-field-toggle" onClick={() => setShow((v) => !v)} aria-label="Toggle password">
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
            <Button type="submit" disabled={loading} className="w-full rounded-xl py-2.5 text-sm font-semibold">
              {loading ? <Spinner className="h-4 w-4" /> : 'Reset password'}
            </Button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-[var(--muted)]">
          <Link to="/login" className="font-medium accent-text transition hover:underline">
            Back to sign in
          </Link>
        </p>
      </AuthCard>
    </AuthLayout>
  );
}
