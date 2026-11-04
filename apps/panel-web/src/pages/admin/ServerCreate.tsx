import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Egg, HardDrive, Plus, Server, Terminal, Users } from 'lucide-react';
import {
  SERVER_PROVISION_FORM_ID,
  ServerProvisionForm,
  type ServerProvisionProgressInfo,
} from '../../components/admin/ServerProvisionForm';
import { AdminDetailBody, AdminDetailPage } from '../../components/AdminDetailLayout';
import {
  DEFAULT_SERVER_PROVISION_FORM,
  serverProvisionProgress,
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

const EMPTY_PROGRESS: ServerProvisionProgressInfo = {
  form: DEFAULT_SERVER_PROVISION_FORM,
  autoAssign: true,
  freeAllocations: 0,
  eggName: null,
  nodeName: null,
  ownerName: null,
  allocationPreview: null,
  saving: false,
  error: '',
  canSubmit: false,
};

export function AdminServerCreate() {
  const navigate = useNavigate();
  const [progressInfo, setProgressInfo] = useState<ServerProvisionProgressInfo>(EMPTY_PROGRESS);

  const handleProgress = useCallback((info: ServerProvisionProgressInfo) => {
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

  const nextHint = !progressInfo.form.ownerId
    ? 'Select an owner to continue.'
    : !progressInfo.form.name.trim()
      ? 'Enter a server name to continue.'
      : !progressInfo.form.eggId
        ? 'Choose an egg template to continue.'
        : !progressInfo.form.nodeId
          ? 'Select a node to continue.'
          : progressInfo.autoAssign && progressInfo.freeAllocations === 0
            ? 'This node has no free ports — add allocations first.'
            : !progressInfo.autoAssign && !progressInfo.form.allocationId
              ? 'Pick a primary allocation to continue.'
              : 'Installation starts as soon as the server is created.';

  function handleCreated(serverId: string) {
    navigate(`/admin/servers/${serverId}/manage/console`);
  }

  return (
    <AdminLayout>
      <AdminDetailPage
        breadcrumb={[{ label: 'Servers', to: '/admin/servers' }, { label: 'Provision server' }]}
      >
        <AdminDetailBody>
          <AdminPageStack className="ds-nd-create">
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
                  value: progressInfo.ownerName ? `@${progressInfo.ownerName}` : '—',
                },
                { icon: Egg, label: 'Egg', value: progressInfo.eggName ?? '—' },
                { icon: HardDrive, label: 'Node', value: progressInfo.nodeName ?? '—' },
                {
                  icon: Terminal,
                  label: 'Ready',
                  value: `${progress.done}/${progress.total}`,
                  tone: progress.ready ? 'success' : undefined,
                },
              ]}
            />

            <div className="ds-nd-create-layout">
              <div className="ds-nd-create-main">
                <AdminStepProgress steps={progress.steps} label="Provisioning checklist" />
                <ServerProvisionForm onCreated={handleCreated} onProgressChange={handleProgress} />
              </div>

              <aside className="ds-nd-create-aside">
                <section className="ds-nd-create-aside-card">
                  <p className="ds-nd-create-aside-eyebrow">Live draft</p>
                  <h2 className="ds-nd-create-aside-title">Preview</h2>
                  <div className="ds-nd-st-connection-preview-rows">
                    <div className="ds-nd-st-connection-preview-row">
                      <span>Name</span>
                      <code>{progressInfo.form.name.trim() || '—'}</code>
                    </div>
                    <div className="ds-nd-st-connection-preview-row">
                      <span>Port</span>
                      <code>{progressInfo.allocationPreview || '—'}</code>
                    </div>
                    <div className="ds-nd-st-connection-preview-row">
                      <span>Limits</span>
                      <code>
                        {progressInfo.form.memory || '0'} MB · {progressInfo.form.disk || '0'} MB ·{' '}
                        {progressInfo.form.cpu || '0'}%
                      </code>
                    </div>
                  </div>
                  <div className="ds-nd-st-dock-tags mt-3">
                    <span className="ds-nd-tag">
                      {progressInfo.autoAssign ? 'Auto port' : 'Manual port'}
                    </span>
                    <span className="ds-nd-tag">
                      {progressInfo.freeAllocations} free
                    </span>
                    <span className="ds-nd-tag">
                      {progress.ready ? 'Ready' : 'Incomplete'}
                    </span>
                  </div>
                </section>

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
                      You&apos;ll open the server console to watch install output.
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
                title={progress.ready ? 'Ready to provision' : 'Almost there'}
                hint={nextHint}
                actions={
                  <>
                    <AdminToolButton to="/admin/servers">Cancel</AdminToolButton>
                    <Button
                      type="submit"
                      form={SERVER_PROVISION_FORM_ID}
                      disabled={progressInfo.saving || !progress.ready}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {progressInfo.saving ? 'Provisioning…' : 'Create & install'}
                      {!progressInfo.saving ? <ArrowRight className="h-3.5 w-3.5" /> : null}
                    </Button>
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
