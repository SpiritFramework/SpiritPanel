import { useNavigate } from 'react-router-dom';
import { ChevronRight, Egg, Layers, User } from 'lucide-react';
import type { AdminNestSummary } from '../lib/api';

const NEST_GRADIENT = 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 45%, #2e1065 100%)';

export function AdminNestTable({ nests }: { nests: AdminNestSummary[] }) {
  return (
    <div className="table-scroll-touch overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="w-full min-w-[880px] text-left text-xs">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--bg-elevated)]/50 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            <th className="px-4 py-2.5 font-semibold">Nest</th>
            <th className="px-4 py-2.5 font-semibold">Author</th>
            <th className="px-4 py-2.5 font-semibold">Identifier</th>
            <th className="px-4 py-2.5 font-semibold">Usage</th>
            <th className="px-4 py-2.5 font-semibold">Created</th>
            <th className="px-4 py-2.5 font-semibold">Status</th>
            <th className="w-10 px-2 py-2.5" aria-hidden />
          </tr>
        </thead>
        <tbody>
          {nests.map((nest) => (
            <AdminNestRow key={nest.id} nest={nest} />
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--border)] bg-[var(--bg-elevated)]/30 px-4 py-2 text-[10px] text-[var(--muted)]">
        <span className="inline-flex items-center gap-1"><Egg className="h-3 w-3" /> Eggs in nest</span>
      </div>
    </div>
  );
}

function AdminNestRow({ nest }: { nest: AdminNestSummary }) {
  const navigate = useNavigate();
  const created = new Date(nest.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const uuidShort = nest.uuid.split('-')[0] ?? nest.uuid.slice(0, 8);
  const hasEggs = nest._count.eggs > 0;
  const authorShort = nest.author.includes('@') ? nest.author.split('@')[0]! : nest.author;

  return (
    <tr
      onClick={() => navigate(`/admin/nests/${nest.id}`)}
      className="group cursor-pointer border-b border-[var(--border)]/60 transition last:border-b-0 hover:bg-[var(--surface-hover)]"
    >
      <td className="px-4 py-3">
        <div className="flex min-w-[200px] items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-white/10"
            style={{ background: NEST_GRADIENT }}
          >
            <Layers className="h-4 w-4 text-white/90" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium group-hover:accent-text">{nest.name}</p>
            <p className="truncate text-[11px] text-[var(--muted)]">
              {nest.description || 'No description'}
            </p>
          </div>
        </div>
      </td>

      <td className="px-4 py-3">
        <span
          className="inline-flex min-w-[80px] items-center gap-1 truncate text-[11px] text-[var(--muted)]"
          title={nest.author}
        >
          <User className="h-3 w-3 shrink-0 opacity-70" />
          {authorShort}
        </span>
      </td>

      <td className="px-4 py-3">
        <p className="min-w-[100px] truncate font-mono text-[11px]" title={nest.uuid}>
          {uuidShort}
        </p>
      </td>

      <td className="px-4 py-3">
        <UsageChip count={nest._count.eggs} />
      </td>

      <td className="whitespace-nowrap px-4 py-3 text-[11px] text-[var(--muted)]">{created}</td>

      <td className="px-4 py-3">
        <NestStatus hasEggs={hasEggs} eggCount={nest._count.eggs} />
      </td>

      <td className="px-2 py-3">
        <ChevronRight className="h-4 w-4 text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:accent-text" />
      </td>
    </tr>
  );
}

function UsageChip({ count }: { count: number }) {
  const empty = count === 0;
  return (
    <span
      title="Eggs in this nest"
      className={`inline-flex min-w-[2.25rem] items-center justify-center gap-1 rounded-md px-2 py-1 text-[10px] tabular-nums ${
        empty ? 'bg-[var(--bg-elevated)]/60 text-[var(--muted)]/60' : 'bg-[var(--bg-elevated)] text-[var(--muted)]'
      }`}
    >
      <Egg className="h-3 w-3 shrink-0 opacity-70" />
      {count}
    </span>
  );
}

function NestStatus({ hasEggs, eggCount }: { hasEggs: boolean; eggCount: number }) {
  if (hasEggs) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">
        <Egg className="h-3 w-3" />
        {eggCount} egg{eggCount === 1 ? '' : 's'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">
      Empty
    </span>
  );
}
