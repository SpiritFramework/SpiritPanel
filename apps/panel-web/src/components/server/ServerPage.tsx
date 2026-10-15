import type { ReactNode } from 'react';

/** Consistent outer wrapper for every server manage tab. */
export function ServerPage({
  children,
  className = '',
  fullHeight,
}: {
  children: ReactNode;
  className?: string;
  fullHeight?: boolean;
}) {
  return (
    <div
      className={`server-page ${fullHeight ? 'flex min-h-0 flex-1 flex-col' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function ServerErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
      {message}
    </div>
  );
}
