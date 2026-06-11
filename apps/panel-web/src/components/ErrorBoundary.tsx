import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
}

/** Catches render errors so a single page failure does not white-screen the panel. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    /* Details stay server-side / devtools — never show stack traces in UI */
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--bg)] p-6">
        <div className="ds-empty max-w-md w-full border-solid">
          <div className="ds-empty-icon">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </div>
          <h1 className="ds-empty-title">{this.props.fallbackTitle ?? 'Something went wrong'}</h1>
          <p className="ds-empty-description">
            This page encountered an unexpected error. Refresh to try again, or return to the dashboard.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button type="button" className="ds-btn ds-btn--primary ds-btn--md" onClick={this.handleRetry}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Refresh page
            </button>
            <a href="/servers" className="ds-btn ds-btn--secondary ds-btn--md">
              Go to servers
            </a>
          </div>
        </div>
      </div>
    );
  }
}
