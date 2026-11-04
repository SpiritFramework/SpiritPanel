import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Egg, HardDrive, Server, Terminal, Users } from 'lucide-react';
import { ServerProvisionForm } from '../../components/admin/ServerProvisionForm';
import { AdminDetailBody, AdminDetailPage } from '../../components/AdminDetailLayout';
import {
  DEFAULT_SERVER_PROVISION_FORM,
  serverProvisionProgress,
  type ServerProvisionFormState,
} from '../../lib/server-provision';
import { AdminLayout, Button } from '../../components/Layout';
import {
  AdminFormDock,
  AdminHero,
  AdminKpiStrip,
  AdminPageStack,
  AdminStepProgress,
  AdminToolButton,
} from '../../components/admin/primitives';

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
        <AdminDetailBody>
          <AdminPageStack className=" ds-nd-create">
            <AdminHero
              eyebrow="Provisioning"
              title="Provision server"
              description="Create a new game server and start installation on a Wings node"
              actions={<AdminToolButton to="/admin/servers">Cancel</AdminToolButton>}
            />

            <AdminKpiStrip
              label="Draft summary"
              columns={4}
              items={[
                {
                  icon: Users,
                  label: 'Owner',
                  value: progressInfo.form.ownerId ? 'Selected' : '—',
                },
                { icon: Egg, label: 'Egg', value: progressInfo.eggName ?? '—' },
                { icon: HardDrive, label: 'Node', value: progressInfo.nodeName ?? '—' },
                { icon: Terminal, label: 'Ready', value: `${progress.done}/${progress.total}` },
              ]}
            />

            <div className="ds-nd-create-layout">
              <div className="ds-nd-create-main">
                <AdminStepProgress steps={progress.steps} label="Provisioning checklist" />
                <ServerProvisionForm onCreated={handleCreated} onProgressChange={handleProgress} />
              </div>

              <aside className="ds-nd-create-aside">
                <section className="ds-nd-create-aside-card">
                  <p className="ds-nd-create-aside-eyebrow">Next</p>
                  <h2 className="ds-nd-create-aside-title">After provisioning</h2>
                  <ol className="ds-nd-create-aside-steps">
                    <li>
                      <span>1</span>
                      Installation runs automatically on the selected node.
                    </li>
                    <li>
                      <span>2</span>
                      You&apos;ll be taken to the server console to watch install output.
                    </li>
                    <li>
                      <span>3</span>
                      The owner can manage the server from their client area once install completes.
                    </li>
                  </ol>
                </section>

                <section className="ds-nd-create-aside-card">
                  <p className="ds-nd-create-aside-eyebrow">Jump</p>
                  <h2 className="ds-nd-create-aside-title">Resources</h2>
                  <div className="ds-nd-create-aside-links">
                    <Link to="/admin/nodes" className="ds-nd-create-aside-link">
                      <HardDrive className="h-3.5 w-3.5" aria-hidden />
                      <span>
                        <strong>Nodes</strong>
                        <em>Manage Wings hosts</em>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 opacity-50" aria-hidden />
                    </Link>
                    <Link to="/admin/nests" className="ds-nd-create-aside-link">
                      <Egg className="h-3.5 w-3.5" aria-hidden />
                      <span>
                        <strong>Nests & eggs</strong>
                        <em>Service templates</em>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 opacity-50" aria-hidden />
                    </Link>
                    <Link to="/admin/servers" className="ds-nd-create-aside-link">
                      <Server className="h-3.5 w-3.5" aria-hidden />
                      <span>
                        <strong>All servers</strong>
                        <em>Back to server list</em>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 opacity-50" aria-hidden />
                    </Link>
                  </div>
                </section>
              </aside>

              <AdminFormDock
                title={progress.ready ? 'Ready to provision' : 'Complete the checklist'}
                hint={
                  progress.ready
                    ? 'Installation starts as soon as the server is created.'
                    : 'Select owner, egg, node, and allocation to continue.'
                }
                actions={
                  <>
                    <AdminToolButton to="/admin/servers">Cancel</AdminToolButton>
                    {progress.ready ? (
                      <Button type="button" disabled>
                        Use the form Create button above
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </>
                }
              />
            </div>
          </AdminPageStack>
        </AdminDetailBody>
      </AdminDetailPage>
    </AdminLayout>
  );
}
