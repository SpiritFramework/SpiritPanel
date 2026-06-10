import { Shield } from 'lucide-react';
import type { AdminUserSummary } from '../lib/api';

export function getUserTheme(user: { role: string; rootAdmin: boolean; suspended: boolean }) {
  if (user.suspended) {
    return {
      gradient: 'linear-gradient(135deg, #78350f 0%, #451a03 100%)',
      glow: 'rgba(245, 158, 11, 0.28)',
    };
  }
  if (user.role === 'admin') {
    return {
      gradient: user.rootAdmin
        ? 'linear-gradient(135deg, #6366f1 0%, #7c3aed 55%, #4338ca 100%)'
        : 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
      glow: 'rgba(99, 102, 241, 0.35)',
    };
  }
  return {
    gradient: 'linear-gradient(135deg, #475569 0%, #1e293b 100%)',
    glow: 'rgba(148, 163, 184, 0.22)',
  };
}

export function displayName(user: Pick<AdminUserSummary, 'firstName' | 'lastName' | 'username'>) {
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username;
}

export function AccountStatus({ suspended, onDark }: { suspended: boolean; onDark?: boolean }) {
  if (suspended) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
          onDark
            ? 'border-yellow-400/30 bg-black/25 text-yellow-200 backdrop-blur-sm'
            : 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
        }`}
      >
        Suspended
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
        onDark
          ? 'border-white/15 bg-black/25 text-white/90 backdrop-blur-sm'
          : 'border-green-500/30 bg-green-500/10 text-green-400'
      }`}
    >
      <span className="h-1 w-1 rounded-full bg-green-400 status-pulse" />
      Active
    </span>
  );
}

export function RoleBadge({
  role,
  rootAdmin,
  onDark,
}: {
  role: string;
  rootAdmin: boolean;
  onDark?: boolean;
}) {
  if (role === 'admin') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
          onDark
            ? 'bg-white/15 text-white backdrop-blur-sm'
            : 'bg-[var(--accent-muted)] accent-text'
        }`}
      >
        <Shield className="h-3 w-3" />
        {rootAdmin ? 'Root admin' : 'Admin'}
      </span>
    );
  }
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
        onDark ? 'bg-white/10 text-white/75 backdrop-blur-sm' : 'bg-[var(--bg-elevated)] text-[var(--muted)]'
      }`}
    >
      User
    </span>
  );
}
