import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, KeyRound, Mail } from 'lucide-react';
import { api } from '../lib/api';
import { useBranding } from '../context/BrandingContext';
import { AuthCard, AuthError, AuthField, AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Layout';
import { Spinner } from '../components/ui';
import { TurnstileWidget, resetTurnstileWidget } from '../components/TurnstileWidget';

export function ForgotPasswordPage() {
  const { branding } = useBranding();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [mailDisabled, setMailDisabled] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');

  const turnstileRequired = branding.turnstileEnabled && Boolean(branding.turnstileSiteKey);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.forgotPassword(email.trim(), turnstileToken || undefined);
      if (!res.mailEnabled) {
        setMailDisabled(true);
      } else {
        setSent(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setTurnstileToken('');
      resetTurnstileWidget();
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout branding={branding}>
      <AuthCard>
        <div className="mb-6 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl accent-bg text-white shadow-lg">
            <KeyRound className="h-5 w-5" />
          </span>
          <div className="min-w-0 pt-0.5">
            <h2 className="text-lg font-semibold tracking-tight">Forgot password</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">
              Enter your account email and we&apos;ll send you a reset link.
            </p>
          </div>
        </div>

        {sent ? (
          <div className="rounded-xl border border-[var(--success-border)] bg-[var(--success-bg)] px-4 py-4 text-sm" style={{ color: 'var(--success-fg)' }}>
            <CheckCircle2 className="mb-2 h-5 w-5" />
            <p className="font-medium">Check your inbox</p>
            <p className="mt-1 text-xs opacity-90">
              If an account exists for that email, a password reset link is on its way. The link expires in 1 hour.
            </p>
          </div>
        ) : mailDisabled ? (
          <AuthError message="Email delivery is not configured on this panel. Please contact an administrator to reset your password." />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <AuthField
              label="Email address"
              icon={Mail}
              type="email"
              value={email}
              onChange={setEmail}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
            {error && <AuthError message={error} />}
            {turnstileRequired && (
              <TurnstileWidget
                siteKey={branding.turnstileSiteKey}
                onToken={setTurnstileToken}
                onExpire={() => setTurnstileToken('')}
                className="flex justify-center"
              />
            )}
            <Button type="submit" disabled={loading || (turnstileRequired && !turnstileToken)} className="w-full rounded-xl py-2.5 text-sm font-semibold">
              {loading ? <Spinner className="h-4 w-4" /> : 'Send reset link'}
            </Button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-[var(--muted)]">
          <Link to="/login" className="inline-flex items-center gap-1 font-medium accent-text transition hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
          </Link>
        </p>
      </AuthCard>
    </AuthLayout>
  );
}
