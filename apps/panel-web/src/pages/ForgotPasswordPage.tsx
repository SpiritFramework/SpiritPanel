import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, KeyRound, Mail } from 'lucide-react';
import { api } from '../lib/api';
import { useBranding } from '../context/BrandingContext';
import { AuthError, AuthField, AuthFooter, AuthHeader, AuthLayout, AuthShell } from '../components/AuthLayout';
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
      <AuthShell>
        <AuthHeader
          eyebrow="Account recovery"
          title="Forgot your password?"
          description="Enter your account email and we'll send you a reset link."
          icon={KeyRound}
        />

        {sent ? (
          <div className="ds-auth-alert ds-auth-alert--success">
            <CheckCircle2 className="mb-2 h-5 w-5" />
            <p className="font-medium">Check your inbox</p>
            <p className="mt-1 text-xs opacity-90">
              If an account exists for that email, a password reset link is on its way. The link expires in 1 hour.
            </p>
          </div>
        ) : mailDisabled ? (
          <AuthError message="Email delivery is not configured on this panel. Please contact an administrator to reset your password." />
        ) : (
          <form onSubmit={handleSubmit} className="ds-auth-form">
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
            <Button
              type="submit"
              disabled={loading || (turnstileRequired && !turnstileToken)}
              variant="primary"
              className="ds-auth-submit"
            >
              {loading ? <Spinner className="h-4 w-4" /> : 'Send reset link'}
            </Button>
          </form>
        )}

        <AuthFooter>
          <Link to="/login" className="ds-auth-link-btn">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </AuthFooter>
      </AuthShell>
    </AuthLayout>
  );
}
