import { Link } from 'react-router-dom';
import { ChevronRight, Mail, Shield, User } from 'lucide-react';
import type { AdminSupportOwner } from '../../context/AdminSupportContext';
import { ServerEggIcon } from '../ServerEggIcon';
import { UserAvatar } from '../../components/UserAvatar';

export function AdminSupportBanner({
  owner,
  serverName,
  eggName,
  eggLogoUrl,
  themeGradient,
  backTo,
  compact = false,
}: {
  owner: AdminSupportOwner;
  serverName: string;
  eggName: string;
  eggLogoUrl?: string | null;
  themeGradient: string;
  backTo: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`admin-support-banner shrink-0 overflow-hidden border-b border-amber-500/30 bg-gradient-to-r from-amber-500/12 via-amber-500/6 to-transparent ${
        compact ? 'admin-support-banner--compact rounded-none border-b' : 'rounded-xl border'
      }`}
    >
      <div className={compact ? 'flex flex-col gap-1.5 p-1.5 sm:gap-2 sm:p-2' : 'flex flex-col gap-2 p-2 sm:gap-3 sm:p-4'}>
        <div className="flex min-w-0 items-center justify-between gap-2 sm:items-start sm:gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:items-start sm:gap-3">
            <div className={`flex shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/25 ${compact ? 'h-7 w-7' : 'h-8 w-8 sm:h-10 sm:w-10 sm:rounded-xl'}`}>
              <Shield className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4 sm:h-5 sm:w-5'} />
            </div>
            <div className="min-w-0">
              <p className={`font-bold uppercase tracking-wider text-amber-300/90 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
                Admin support
              </p>
              <p className={`mt-0.5 truncate font-semibold text-[var(--text)] ${compact ? 'text-[11px]' : 'text-xs sm:text-sm'}`}>
                {owner.username}
                <span className="font-normal text-[var(--muted)]"> · {serverName}</span>
              </p>
              <p className={compact ? 'hidden' : 'admin-support-banner-detail mt-1 hidden text-xs leading-snug text-[var(--muted)] sm:block'}>
                Commands and output are logged for audit. The owner is not notified.
              </p>
            </div>
          </div>

          <Link
            to={`/admin/users/${owner.id}`}
            title={`${owner.username} · ${owner.email}`}
            className={`mobile-icon-btn group flex shrink-0 items-center rounded-lg border border-[var(--border)] bg-[var(--surface)]/80 p-1.5 transition hover:border-amber-500/35 hover:bg-[var(--surface-hover)] ${compact ? 'sm:p-1.5' : 'gap-2 sm:gap-2.5 sm:px-3 sm:py-2'}`}
          >
            <UserAvatar user={owner} size="sm" ring className="!rounded-lg" />
            {!compact && (
              <span className="hidden min-w-0 sm:block sm:max-w-[9rem]">
                <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  <User className="h-3 w-3" />
                  Owner
                </span>
                <span className="block truncate text-sm font-semibold group-hover:text-amber-200">
                  {owner.username}
                </span>
                <span className="hidden items-center gap-1 truncate text-[11px] text-[var(--muted)] md:flex">
                  <Mail className="h-3 w-3 shrink-0" />
                  {owner.email}
                </span>
              </span>
            )}
            {!compact && <ChevronRight className="hidden h-4 w-4 shrink-0 text-[var(--muted)] transition group-hover:text-amber-300 sm:block" />}
          </Link>
        </div>

        <div className={`flex flex-wrap items-center gap-1.5 border-t border-amber-500/15 ${compact ? 'pt-1.5' : 'pt-2 sm:pt-3'}`}>
          <Link
            to={backTo}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border)] px-2 py-1 text-[11px] text-[var(--muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text)] sm:px-2.5 sm:py-1.5 sm:text-xs"
          >
            ← Details
          </Link>
          <span className="hidden h-4 w-px bg-[var(--border)] sm:block" />
          <div className="flex min-w-0 items-center gap-2">
            <div
              className={`flex shrink-0 items-center justify-center rounded-lg ring-1 ring-white/10 ${compact ? 'h-5 w-5' : 'h-6 w-6 sm:h-7 sm:w-7'}`}
              style={{ background: themeGradient }}
            >
              <ServerEggIcon eggName={eggName} logoUrl={eggLogoUrl} className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3 sm:h-3.5 sm:w-3.5'} />
            </div>
            <span className={`truncate font-medium text-[var(--text)] ${compact ? 'text-[10px]' : 'text-[11px] sm:text-xs'}`}>{serverName}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
