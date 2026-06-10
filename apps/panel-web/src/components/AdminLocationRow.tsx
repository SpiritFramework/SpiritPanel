import { useNavigate } from 'react-router-dom';
import { ChevronRight, Globe, MapPin, Network } from 'lucide-react';
import type { AdminLocationSummary } from '../lib/api';

const LOCATION_GRADIENT = 'linear-gradient(135deg, #064e3b 0%, #047857 45%, #022c22 100%)';

export function AdminLocationTable({ locations }: { locations: AdminLocationSummary[] }) {
  return (
    <div className="table-scroll-touch overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="w-full min-w-[880px] text-left text-xs">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--bg-elevated)]/50 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            <th className="px-4 py-2.5 font-semibold">Location</th>
            <th className="px-4 py-2.5 font-semibold">Identifier</th>
            <th className="px-4 py-2.5 font-semibold">Usage</th>
            <th className="px-4 py-2.5 font-semibold">Created</th>
            <th className="px-4 py-2.5 font-semibold">Status</th>
            <th className="w-10 px-2 py-2.5" aria-hidden />
          </tr>
        </thead>
        <tbody>
          {locations.map((location) => (
            <AdminLocationRow key={location.id} location={location} />
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--border)] bg-[var(--bg-elevated)]/30 px-4 py-2 text-[10px] text-[var(--muted)]">
        <span className="inline-flex items-center gap-1"><Network className="h-3 w-3" /> Wings nodes in region</span>
      </div>
    </div>
  );
}

function AdminLocationRow({ location }: { location: AdminLocationSummary }) {
  const navigate = useNavigate();
  const created = new Date(location.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const uuidShort = location.uuid.split('-')[0] ?? location.uuid.slice(0, 8);
  const inUse = location._count.nodes > 0;

  return (
    <tr
      onClick={() => navigate(`/admin/locations/${location.id}`)}
      className="group cursor-pointer border-b border-[var(--border)]/60 transition last:border-b-0 hover:bg-[var(--surface-hover)]"
    >
      <td className="px-4 py-3">
        <div className="flex min-w-[200px] items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-white/10"
            style={{ background: LOCATION_GRADIENT }}
          >
            <Globe className="h-4 w-4 text-white/90" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium group-hover:accent-text">{location.short}</p>
            <p className="truncate text-[11px] text-[var(--muted)]">{location.long}</p>
          </div>
        </div>
      </td>

      <td className="px-4 py-3">
        <p className="min-w-[100px] truncate font-mono text-[11px]" title={location.uuid}>
          {uuidShort}
        </p>
      </td>

      <td className="px-4 py-3">
        <UsageChip count={location._count.nodes} />
      </td>

      <td className="whitespace-nowrap px-4 py-3 text-[11px] text-[var(--muted)]">{created}</td>

      <td className="px-4 py-3">
        <LocationStatus inUse={inUse} nodeCount={location._count.nodes} />
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
      title="Wings nodes in this region"
      className={`inline-flex min-w-[2.25rem] items-center justify-center gap-1 rounded-md px-2 py-1 text-[10px] tabular-nums ${
        empty ? 'bg-[var(--bg-elevated)]/60 text-[var(--muted)]/60' : 'bg-[var(--bg-elevated)] text-[var(--muted)]'
      }`}
    >
      <Network className="h-3 w-3 shrink-0 opacity-70" />
      {count}
    </span>
  );
}

function LocationStatus({ inUse, nodeCount }: { inUse: boolean; nodeCount: number }) {
  if (inUse) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">
        <MapPin className="h-3 w-3" />
        {nodeCount} node{nodeCount === 1 ? '' : 's'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">
      Empty
    </span>
  );
}
