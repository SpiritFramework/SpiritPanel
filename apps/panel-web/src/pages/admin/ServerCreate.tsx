import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Egg,
  HardDrive,
  Server,
  Terminal,
  Users,
} from 'lucide-react';
import { ServerProvisionForm } from '../../components/admin/ServerProvisionForm';
import {
  AdminDetailBody,
  AdminDetailHero,
  AdminDetailManageLayout,
  AdminDetailPage,
  AdminQuickLink,
  AdminSidebarCard,
} from '../../components/AdminDetailLayout';
import {
  DEFAULT_SERVER_PROVISION_FORM,
  SERVER_PROVISION_GRADIENT,
  serverProvisionProgress,
  type ServerProvisionFormState,
} from '../../lib/server-provision';
import { AdminLayout, Button } from '../../components/Layout';

type ProgressInfo = {
  form: ServerProvisionFormState;
  autoAssign: boolean;
  freeAllocations: number;
  eggName: string | null;
  nodeName: string | null;
};

export function AdminServerCreate() {
  const navigate = useNavigate();
  const [progressInfo, setProgressInfo] = useState<ProgressInfo>({
    form: DEFAULT_SERVER_PROVISION_FORM,
    autoAssign: true,
    freeAllocations: 0,
    eggName: null,
    nodeName: null,
  });

  const handleProgress = useCallback((info: ProgressInfo) => {
    setProgressInfo(info);
  }, []);

  const progress = useMemo(
    () =>
      serverProvisionProgress(progressInfo.form, {
        autoAssign: progressInfo.autoAssign,
        hasFreeAllocation: progressInfo.freeAllocations > 0,
      }),
    [progressInfo],
  );

  function handleCreated(serverId: string) {
    navigate(`/admin/servers/${serverId}/manage/console`);
  }

  return (
    <AdminLayout>
      <AdminDetailPage breadcrumb={[{ label: 'Servers', to: '/admin/servers' }, { label: 'Provision server' }]}>
        <AdminDetailHero
          gradient={SERVER_PROVISION_GRADIENT}
          icon={Server}
          title="Provision server"
          subtitle="Create a new game server and start installation on a Wings node"
          stats={[
            { icon: Users, label: 'Owner', value: progressInfo.form.ownerId ? 'Selected' : '—' },
            { icon: Egg, label: 'Egg', value: progressInfo.eggName ?? '—' },
            { icon: HardDrive, label: 'Node', value: progressInfo.nodeName ?? '—' },
            {
              icon: Terminal,
              label: 'Ready',
              value: `${progress.done}/${progress.total}`,
            },
          ]}
          actions={
            <Link to="/admin/servers">
              <Button type="button" variant="ghost" className="border border-white/15 bg-black/20 text-white hover:bg-black/30">
                Cancel
              </Button>
            </Link>
          }
        />

        <AdminDetailBody>
          <AdminDetailManageLayout
            sidebar={
              <>
                <AdminSidebarCard title="Provisioning checklist">
                  <ul className="space-y-2.5">
                    {progress.steps.map((step) => (
                      <li key={step.id} className="flex items-center gap-2.5 text-xs">
                        {step.done ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />
                        ) : (
                          <Circle className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                        )}
                        <span className={step.done ? 'text-[var(--text)]' : 'text-[var(--muted)]'}>{step.label}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-all"
                      style={{ width: `${(progress.done / progress.total) * 100}%` }}
                    />
                  </div>
                </AdminSidebarCard>

                <AdminSidebarCard title="After provisioning">
                  <ol className="space-y-2 text-[11px] leading-relaxed text-[var(--muted)]">
                    <li className="flex gap-2">
                      <span className="font-semibold text-[var(--text)]">1.</span>
                      Installation runs automatically on the selected node.
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold text-[var(--text)]">2.</span>
                      You&apos;ll be taken to the server console to watch install output.
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold text-[var(--text)]">3.</span>
                      The owner can manage the server from their client area once install completes.
                    </li>
                  </ol>
                </AdminSidebarCard>

                <AdminSidebarCard title="Resources">
                  <AdminQuickLink icon={HardDrive} label="Nodes" hint="Manage Wings hosts" onClick={() => navigate('/admin/nodes')} />
                  <AdminQuickLink icon={Egg} label="Nests & eggs" hint="Service templates" onClick={() => navigate('/admin/nests')} />
                  <AdminQuickLink icon={Server} label="All servers" hint="Back to server list" onClick={() => navigate('/admin/servers')} />
                </AdminSidebarCard>
              </>
            }
          >
            <ServerProvisionForm onCreated={handleCreated} onProgressChange={handleProgress} />

            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-4">
              <Link to="/admin/servers">
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </Link>
              {progress.ready && (
                <p className="text-xs text-green-400/90">
                  Ready to provision
                  <ArrowRight className="ml-1 inline h-3 w-3" />
                </p>
              )}
            </div>
          </AdminDetailManageLayout>
        </AdminDetailBody>
      </AdminDetailPage>
    </AdminLayout>
  );
}
