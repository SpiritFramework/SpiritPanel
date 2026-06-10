import { useNavigate } from 'react-router-dom';
import { ChevronRight, Egg, Layers, Server, Variable } from 'lucide-react';
import type { AdminEggSummary } from '../lib/api';

const EGG_GRADIENT = 'linear-gradient(135deg, #78350f 0%, #d97706 45%, #451a03 100%)';

const USAGE_LABELS = [
  { key: 'variables' as const, icon: Variable, title: 'Startup variables' },
  { key: 'servers' as const, icon: Server, title: 'Deployed servers' },
];

export function AdminEggTable({ eggs }: { eggs: AdminEggSummary[] }) {
  return (
    <div className="table-scroll-touch overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="w-full min-w-[960px] text-left text-xs">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--bg-elevated)]/50 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            <th className="px-4 py-2.5 font-semibold">Egg</th>
            <th className="px-4 py-2.5 font-semibold">Nest</th>
            <th className="px-4 py-2.5 font-semibold">Author</th>
            <th className="px-4 py-2.5 font-semibold">Usage</th>
            <th className="px-4 py-2.5 font-semibold">Created</th>
            <th className="px-4 py-2.5 font-semibold">Status</th>
            <th className="w-10 px-2 py-2.5" aria-hidden />
          </tr>
        </thead>
        <tbody>
          {eggs.map((egg) => (
            <AdminEggRow key={egg.id} egg={egg} />
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--border)] bg-[var(--bg-elevated)]/30 px-4 py-2 text-[10px] text-[var(--muted)]">
        <span className="inline-flex items-center gap-1"><Variable className="h-3 w-3" /> Startup variables</span>
        <span className="inline-flex items-center gap-1"><Server className="h-3 w-3" /> Deployed servers</span>
      </div>
    </div>
  );
}

function AdminEggRow({ egg }: { egg: AdminEggSummary }) {
  const navigate = useNavigate();
  const created = new Date(egg.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const authorShort = egg.author.includes('@') ? egg.author.split('@')[0]! : egg.author;

  return (
    <tr
      onClick={() => navigate(`/admin/eggs/${egg.id}`)}
      className="group cursor-pointer border-b border-[var(--border)]/60 transition last:border-b-0 hover:bg-[var(--surface-hover)]"
    >
      <td className="px-4 py-3">
        <div className="flex min-w-[200px] items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-white/10"
            style={{ background: EGG_GRADIENT }}
          >
            <Egg className="h-4 w-4 text-white/90" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium group-hover:accent-text">{egg.name}</p>
            <p className="truncate text-[11px] text-[var(--muted)]">
              {egg.description || `by ${egg.author}`}
            </p>
          </div>
        </div>
      </td>

      <td className="px-4 py-3">
        <span className="inline-flex min-w-[100px] items-center gap-1 truncate text-[11px]">
          <Layers className="h-3 w-3 shrink-0 text-[var(--muted)]" />
          {egg.nest.name}
        </span>
      </td>

      <td className="whitespace-nowrap px-4 py-3 text-[11px] text-[var(--muted)]" title={egg.author}>
        {authorShort}
      </td>

      <td className="px-4 py-3">
        <div className="flex min-w-[80px] gap-1.5">
          {USAGE_LABELS.map(({ key, icon, title }) => (
            <UsageChip
              key={key}
              icon={icon}
              label={String(egg._count[key])}
              title={title}
            />
          ))}
        </div>
      </td>

      <td className="whitespace-nowrap px-4 py-3 text-[11px] text-[var(--muted)]">{created}</td>

      <td className="px-4 py-3">
        <EggStatus enabled={egg.enabled} deployed={egg._count.servers > 0} />
      </td>

      <td className="px-2 py-3">
        <ChevronRight className="h-4 w-4 text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:accent-text" />
      </td>
    </tr>
  );
}

function UsageChip({
  icon: Icon,
  label,
  title,
}: {
  icon: typeof Server;
  label: string;
  title: string;
}) {
  const empty = label === '0';
  return (
    <span
      title={title}
      className={`inline-flex min-w-[2.25rem] items-center justify-center gap-1 rounded-md px-2 py-1 text-[10px] tabular-nums ${
        empty ? 'bg-[var(--bg-elevated)]/60 text-[var(--muted)]/60' : 'bg-[var(--bg-elevated)] text-[var(--muted)]'
      }`}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-70" />
      {label}
    </span>
  );
}

function EggStatus({ enabled, deployed }: { enabled: boolean; deployed: boolean }) {
  if (!enabled) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
        Disabled
      </span>
    );
  }
  if (deployed) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">
        <span className="h-1 w-1 rounded-full bg-green-400 status-pulse" />
        In use
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">
      Enabled
    </span>
  );
}
