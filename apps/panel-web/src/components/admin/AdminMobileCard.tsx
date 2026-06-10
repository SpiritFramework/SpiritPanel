import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

/** Tap-friendly list row for admin tables on small screens. */
export function AdminMobileCard({
  onClick,
  leading,
  title,
  subtitle,
  meta,
  badges,
  trailing,
}: {
  onClick?: () => void;
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  badges?: ReactNode;
  trailing?: ReactNode;
}) {
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-left shadow-sm transition ${
        onClick ? 'cursor-pointer hover:border-[color-mix(in_srgb,var(--accent)_35%,var(--border))] hover:bg-[var(--surface-hover)]' : ''
      }`}
    >
      {leading}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium">{title}</p>
          {badges}
        </div>
        {subtitle && <p className="mt-0.5 truncate text-[11px] text-[var(--muted)]">{subtitle}</p>}
        {meta && <div className="mt-2 space-y-1 text-[11px] text-[var(--muted)]">{meta}</div>}
      </div>
      {trailing ?? (onClick ? <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" /> : null)}
    </Tag>
  );
}

/** Desktop table + mobile card stack wrapper for admin lists. */
export function AdminResponsiveTable({
  mobile,
  desktop,
}: {
  mobile: ReactNode;
  desktop: ReactNode;
}) {
  return (
    <>
      <div className="space-y-2 md:hidden">{mobile}</div>
      <div className="table-scroll-touch hidden overflow-x-auto rounded-xl border border-[var(--border)] md:block">
        {desktop}
      </div>
    </>
  );
}
