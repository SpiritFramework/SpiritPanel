import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  /** Compact section fallback with soft remount (no full page reload). */
  nested?: boolean;
}

interface State {
  hasError: boolean;
  retryKey: number;
}

/** Catches render errors so a single page failure does not white-screen the panel. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, retryKey: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught an error', error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState((prev) => ({ hasError: false, retryKey: prev.retryKey + 1 }));
  };

  private handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const nested = this.props.nested;
      return (
        <div
          className={
            nested
              ? 'flex items-center justify-center p-6'
              : 'flex min-h-[100dvh] items-center justify-center bg-[var(--bg)] p-6'
          }
        >
          <div className={`ds-empty max-w-md w-full border-solid${nested ? '' : ''}`}>
            <div className="ds-empty-icon">
              <AlertTriangle className="h-5 w-5" aria-hidden />
            </div>
            <h1 className="ds-empty-title">{this.props.fallbackTitle ?? 'Something went wrong'}</h1>
            <p className="ds-empty-description">
              {nested
                ? 'This section hit an unexpected error. Try again, or navigate to another page.'
                : 'This page encountered an unexpected error. Retry to remount the view, or refresh the page.'}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button type="button" className="ds-btn ds-btn--primary ds-btn--md" onClick={this.handleRetry}>
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                Try again
              </button>
              {!nested ? (
                <button type="button" className="ds-btn ds-btn--secondary ds-btn--md" onClick={this.handleRefresh}>
                  Refresh page
                </button>
              ) : null}
              <a href="/servers" className="ds-btn ds-btn--secondary ds-btn--md">
                Go to servers
              </a>
            </div>
          </div>
        </div>
      );
    }

    return <Fragment key={this.state.retryKey}>{this.props.children}</Fragment>;
  }
}

/** Thin nested boundary for route outlets / layout content. */
export function RouteErrorBoundary({
  children,
  fallbackTitle = 'This page failed to load',
}: {
  children: ReactNode;
  fallbackTitle?: string;
}) {
  return (
    <ErrorBoundary nested fallbackTitle={fallbackTitle}>
      {children}
    </ErrorBoundary>
  );
}
