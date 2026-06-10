import { useEffect, useMemo, useState } from 'react';
import { Egg, Layers, Plus, Search, Upload } from 'lucide-react';
import { api, type AdminEggSummary, type AdminNestSummary } from '../../lib/api';
import { AdminLayout, Button, Card, FilterSelect } from '../../components/Layout';
import { AdminNestTable } from '../../components/AdminNestRow';
import { AdminEggTable } from '../../components/AdminEggRow';
import { CreateNestModal } from '../../components/CreateNestModal';
import { ImportEggModal } from '../../components/ImportEggModal';
import { EmptyState, PageHeader, Spinner, StatCard } from '../../components/ui';

type View = 'nests' | 'eggs';

export function AdminNests() {
  const [view, setView] = useState<View>('nests');
  const [nests, setNests] = useState<AdminNestSummary[]>([]);
  const [eggs, setEggs] = useState<AdminEggSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [nestFilter, setNestFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const term = search.trim() || undefined;
      const [nestData, eggData] = await Promise.all([
        api.admin.nests({ search: term }),
        api.admin.eggs({ search: term, nestId: nestFilter || undefined }),
      ]);
      setNests(nestData);
      setEggs(eggData);
    } catch {
      setNests([]);
      setEggs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [search, nestFilter]);

  const stats = useMemo(
    () => ({
      nests: nests.length,
      eggs: eggs.length,
      withEggs: nests.filter((n) => n._count.eggs > 0).length,
      deployed: eggs.reduce((n, e) => n + e._count.servers, 0),
    }),
    [nests, eggs],
  );

  return (
    <AdminLayout>
      <PageHeader
        title="Nests & Eggs"
        description="Service templates grouped by category — import eggs to provision servers"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setShowImport(true)}>
              <Upload className="h-3.5 w-3.5" />
              Import egg
            </Button>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-3.5 w-3.5" />
              Create nest
            </Button>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Nests" value={stats.nests} icon={<Layers className="h-4 w-4" />} />
        <StatCard label="Eggs" value={stats.eggs} icon={<Egg className="h-4 w-4" />} />
        <StatCard label="With eggs" value={stats.withEggs} icon={<Layers className="h-4 w-4" />} tone="success" />
        <StatCard label="Deployed" value={stats.deployed} icon={<Egg className="h-4 w-4" />} />
      </div>

      <Card title={view === 'nests' ? 'All nests' : 'All eggs'}>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="flex gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-1">
            <TabButton active={view === 'nests'} onClick={() => setView('nests')}>Nests</TabButton>
            <TabButton active={view === 'eggs'} onClick={() => setView('eggs')}>Eggs</TabButton>
          </div>
          <div className="relative min-w-0 w-full max-w-md flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={view === 'nests' ? 'Search name, description, UUID…' : 'Search name, author, UUID…'}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] py-2 pl-8 pr-3 text-[13px] shadow-sm outline-none transition hover:border-[var(--accent)]/35 focus:border-[var(--accent)]/55 focus:ring-2 focus:ring-[var(--accent-muted)]"
            />
          </div>
          {view === 'eggs' && (
            <FilterSelect
              value={nestFilter}
              onChange={(e) => setNestFilter(e.target.value)}
            >
              <option value="">All nests</option>
              {nests.map((n) => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </FilterSelect>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : view === 'nests' ? (
          nests.length === 0 ? (
            <EmptyState title="No nests found" description="Create a nest to organize your eggs." />
          ) : (
            <AdminNestTable nests={nests} />
          )
        ) : eggs.length === 0 ? (
          <EmptyState title="No eggs found" description="Import an egg JSON file into a nest." />
        ) : (
          <AdminEggTable eggs={eggs} />
        )}
      </Card>

      {showCreate && (
        <CreateNestModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}

      {showImport && (
        <ImportEggModal
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false);
            load();
          }}
        />
      )}
    </AdminLayout>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
        active ? 'bg-[var(--surface)] accent-text shadow-sm' : 'text-[var(--muted)] hover:text-[var(--text)]'
      }`}
    >
      {children}
    </button>
  );
}
