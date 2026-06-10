import { Link } from 'react-router-dom';
import { ChevronRight, Mail, Shield, User } from 'lucide-react';
import type { AdminSupportOwner } from '../../context/AdminSupportContext';
import { ServerEggIcon } from '../ServerEggIcon';
import { UserAvatar } from '../UserAvatar';

export function AdminSupportBanner({
  owner,
  serverName,
  eggName,
  eggLogoUrl,
  themeGradient,
  backTo,
}: {
  owner: AdminSupportOwner;
  serverName: string;
  eggName: string;
  eggLogoUrl?: string | null;
  themeGradient: string;
  backTo: string;
}) {
  return (
    <div className="admin-support-banner shrink-0 overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/12 via-amber-500/6 to-transparent">
      <div className="flex flex-col gap-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/25">
              <Shield className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300/90">
                Admin support console
              </p>
              <p className="mt-0.5 text-sm leading-snug text-[var(--text)]">
                Viewing{' '}
                <span className="font-semibold text-amber-400">{owner.username}</span>
                <span className="text-[var(--muted)]">'s server</span>
              </p>
              <p className="mt-1 truncate text-xs text-[var(--muted)]">
                Commands and output are logged for audit. The owner is not notified.
              </p>
            </div>
          </div>

          <Link
            to={`/admin/users/${owner.id}`}
            className="group flex min-w-0 max-w-full items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 px-3 py-2 transition hover:border-amber-500/35 hover:bg-[var(--surface-hover)] sm:max-w-xs"
          >
            <UserAvatar user={owner} size="sm" ring className="!rounded-lg" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                <User className="h-3 w-3" />
                Server owner
              </span>
              <span className="block truncate text-sm font-semibold group-hover:text-amber-200">
                {owner.username}
              </span>
              <span className="flex items-center gap-1 truncate text-[11px] text-[var(--muted)]">
                <Mail className="h-3 w-3 shrink-0" />
                {owner.email}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted)] transition group-hover:text-amber-300" />
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-amber-500/15 pt-3">
          <Link
            to={backTo}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
          >
            ← Server details
          </Link>
          <span className="hidden h-4 w-px bg-[var(--border)] sm:block" />
          <div className="flex min-w-0 items-center gap-2">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-white/10"
              style={{ background: themeGradient }}
            >
              <ServerEggIcon eggName={eggName} logoUrl={eggLogoUrl} className="h-3.5 w-3.5" />
            </div>
            <span className="truncate text-xs font-medium text-[var(--text)]">{serverName}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
