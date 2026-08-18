import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, Trash2 } from 'lucide-react';
import { api, type ServerDomainInfo } from '../../lib/api';
import { AdminLayout, Button } from '../../components/Layout';
import {
  AdminDetailBody,
  AdminDetailHero,
  AdminDetailPage,
} from '../../components/AdminDetailLayout';
import { Spinner } from '../../components/ui';
import { ConfirmModal } from '../../components/ConfirmModal';

type DomainRow = ServerDomainInfo & {
  server: {
    id: string;
    name: string;
    owner: { id: string; username: string; email: string };
    node: { id: string; name: string; domainBase: string | null };
  };
};

export function AdminDomainsPage() {
  const [rows, setRows] = useState<DomainRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setRows(await api.admin.listDomains());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load domains');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function confirmDelete() {
    if (!deleteId) return;
    const row = rows.find((r) => r.id === deleteId);
    if (!row) return;
    setDeleting(true);
    try {
      await api.admin.deleteServerDomain(row.server.id);
      setDeleteId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete domain');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AdminLayout>
      <AdminDetailPage breadcrumb={[{ label: 'Admin', to: '/admin' }, { label: 'Subdomains' }]}>
        <AdminDetailHero
          icon={Globe}
          title="Subdomains"
          subtitle="Cloudflare DNS records created for game servers. Configure credentials under Settings → Access."
        />
        <AdminDetailBody>
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner className="h-6 w-6" />
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 py-12 text-center">
              <Globe className="mx-auto mb-3 h-8 w-8 text-[var(--muted)]" />
              <h3 className="text-sm font-semibold">No subdomains yet</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Users create one subdomain per server from Network once Cloudflare DNS is enabled.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--bg-elevated)]/60 text-[11px] uppercase tracking-wide text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">FQDN</th>
                    <th className="px-4 py-3 font-medium">Server</th>
                    <th className="px-4 py-3 font-medium">Owner</th>
                    <th className="px-4 py-3 font-medium">Node</th>
                    <th className="px-4 py-3 font-medium">Target</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--border)]/70 last:border-0">
                      <td className="px-4 py-3 font-mono text-xs">{row.fqdn}</td>
                      <td className="px-4 py-3">
                        <Link className="accent-text hover:underline" to={`/admin/servers/${row.server.id}`}>
                          {row.server.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)]">{row.server.owner.username}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">{row.server.node.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-[var(--muted)]">{row.targetIp}</td>
                      <td className="px-4 py-3 text-right">
                        <Button type="button" size="sm" variant="danger" onClick={() => setDeleteId(row.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminDetailBody>
      </AdminDetailPage>

      <ConfirmModal
        open={deleteId !== null}
        title="Delete subdomain?"
        description="Removes the Cloudflare DNS record and clears the server subdomain."
        confirmLabel="Delete"
        tone="warning"
        loading={deleting}
        onClose={() => setDeleteId(null)}
        onConfirm={() => void confirmDelete()}
      />
    </AdminLayout>
  );
}
