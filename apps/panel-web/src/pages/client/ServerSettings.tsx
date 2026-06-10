import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cpu,
  Egg,
  Fingerprint,
  Globe,
  HardDrive,
  MemoryStick,
  RotateCw,
  Save,
  Server,
  Settings,
} from 'lucide-react';
import { useServer } from '../../context/ServerContext';
import { useServerLiveOptional } from '../../context/ServerLiveContext';
import { api } from '../../lib/api';
import { formatAllocationAddress } from '../../lib/allocation';
import { getServerAccess } from '../../lib/server-access';
import { useServerManageBase } from '../../hooks/useServerRouteId';
import { isServerInstalling } from '../../lib/server-runtime';
import { getServerTheme } from '../../lib/server-theme';
import { ServerEggIcon } from '../../components/ServerEggIcon';
import { Button, Input, Textarea } from '../../components/Layout';
import { Checkbox } from '../../components/Checkbox';
import { ServerStatusBadge } from '../../components/ServerStatusBadge';
import {
  ServerErrorBanner,
  ServerNotice,
  ServerPage,
  ServerPageHeader,
  ServerPanel,
} from '../../components/server/ServerPage';

export function ServerSettingsPage() {
  const navigate = useNavigate();
  const { serverId: id, base } = useServerManageBase();
  const { server, refresh } = useServer();
  const live = useServerLiveOptional();
  const access = getServerAccess(server);
  const canEditSettings = access.canUpdateSettings;
  const theme = getServerTheme(server.egg.name);

  const [name, setName] = useState(server.name);
  const [description, setDescription] = useState(server.description ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [wipeFiles, setWipeFiles] = useState(true);
  const [confirmReinstall, setConfirmReinstall] = useState(false);
  const [reinstalling, setReinstalling] = useState(false);
  const [reinstallError, setReinstallError] = useState('');

  useEffect(() => {
    setName(server.name);
    setDescription(server.description ?? '');
  }, [server.name, server.description]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!id || !canEditSettings) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await api.client.updateServer(id, { name: name.trim(), description: description.trim() });
      await refresh();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  async function handleReinstall() {
    if (!id || !access.canReinstall) return;
    setReinstalling(true);
    setReinstallError('');
    try {
      await api.client.reinstall(id, wipeFiles);
      await refresh();
      setConfirmReinstall(false);
      navigate(`${base}/console`);
    } catch (err) {
      setReinstallError(err instanceof Error ? err.message : 'Reinstall failed');
    } finally {
      setReinstalling(false);
    }
  }

  const installing = isServerInstalling(server);
  const address = formatAllocationAddress(server.defaultAllocation, {
    fqdn: server.node.fqdn ?? server.defaultAllocation.ip,
  });

  const showInstallFailedHint =
    server.installStatus === 'failed' || server.status === 'install_failed';

  return (
    <ServerPage>
      <ServerPageHeader title="Settings" description="Server details, metadata, and reinstall options" />

      <ServerPanel
        icon={Settings}
        title="General"
        description="Display name and description shown in your server list"
      >
        {!canEditSettings ? (
          <ServerNotice tone="muted">
            You do not have permission to change these settings.
          </ServerNotice>
        ) : (
          <form onSubmit={handleSave} className="w-full space-y-4">
            <Input
              label="Server name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
              placeholder="My Minecraft Server"
              required
              maxLength={191}
            />
            <Textarea
              label="Description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setSaved(false);
              }}
              placeholder="Optional note about this server…"
              maxLength={500}
              rows={3}
            />
            <ServerErrorBanner message={error} />
            <Button type="submit" disabled={saving || !name.trim()}>
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save changes'}
            </Button>
          </form>
        )}
      </ServerPanel>

      <ServerPanel
        icon={Server}
        iconTone="cyan"
        title="Server overview"
        description="Runtime status, connection details, and identifiers"
        noPadding
        bodyClassName="p-0"
      >
        <div className="flex flex-col gap-4 border-b border-[var(--border)]/50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ring-white/10"
              style={{ background: theme.gradient }}
            >
              <ServerEggIcon eggName={server.egg.name} logoUrl={server.egg.logoUrl} className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold">{server.name}</p>
              <p className="text-[11px] text-[var(--muted)]">{server.egg.name}</p>
            </div>
          </div>
          <ServerStatusBadge
            status={server.status}
            suspended={server.suspended}
            installStatus={server.installStatus}
            containerState={server.containerState}
            runtimeState={live?.runtimeState ?? null}
            wsConnected={live?.connectionStatus === 'connected'}
          />
        </div>

        <dl className="divide-y divide-[var(--border)]/50">
          <InfoRow icon={Globe} label="Address" value={address} mono />
          <InfoRow icon={Server} label="Node" value={server.node.name} hint={server.node.fqdn} />
          <InfoRow icon={Egg} label="Egg" value={server.egg.name} />
          <InfoRow icon={Fingerprint} label="Short ID" value={server.uuidShort ?? server.uuid.slice(0, 8)} mono />
          <InfoRow icon={Fingerprint} label="Full UUID" value={server.uuid} mono />
        </dl>

        {showInstallFailedHint && server.status === 'normal' && (
          <div className="border-t border-[var(--border)]/50 p-4">
            <ServerNotice tone="warning">
              A previous install attempt was marked failed in the panel. If the server runs normally, you can
              ignore this — use Reinstall below only if files are actually broken.
            </ServerNotice>
          </div>
        )}
      </ServerPanel>

      <ServerPanel
        icon={Cpu}
        title="Resource limits"
        description="Configured limits for this server — change via your host if you need more"
        bodyClassName="grid gap-3 sm:grid-cols-3"
      >
        <LimitCard icon={MemoryStick} label="Memory" value={`${server.memory} MiB`} />
        <LimitCard icon={HardDrive} label="Disk" value={`${server.disk} MiB`} />
        <LimitCard icon={Cpu} label="CPU" value={`${server.cpu}%`} />
      </ServerPanel>

      {access.canReinstall && (
        <ServerPanel
          icon={RotateCw}
          iconTone="amber"
          title="Reinstall server"
          description="Re-run the egg installation script via FeatherWings"
        >
          <p className="mb-4 text-sm leading-relaxed text-[var(--muted)]">
            Use this if your server is broken or you want a clean setup. The server will be stopped before
            reinstalling.
          </p>
          {installing && (
            <ServerNotice tone="info">
              Installation is already in progress — open the Console tab to watch output.
            </ServerNotice>
          )}

          {!confirmReinstall ? (
            <Button
              type="button"
              variant="ghost"
              disabled={installing || server.suspended}
              onClick={() => setConfirmReinstall(true)}
            >
              <RotateCw className="h-3.5 w-3.5" />
              Reinstall server
            </Button>
          ) : (
            <div className="w-full space-y-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <p className="text-sm text-amber-100">
                Reinstall <strong>{server.name}</strong>? The install script will run again on FeatherWings.
              </p>
              <Checkbox
                label="Wipe all files first"
                description="Deletes everything in the server directory before reinstalling (worlds, configs, mods, etc.)"
                checked={wipeFiles}
                onChange={setWipeFiles}
              />
              <ServerErrorBanner message={reinstallError} />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="danger" disabled={reinstalling} onClick={handleReinstall}>
                  {reinstalling ? 'Reinstalling…' : wipeFiles ? 'Wipe & reinstall' : 'Reinstall'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={reinstalling}
                  onClick={() => setConfirmReinstall(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </ServerPanel>
      )}
    </ServerPage>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  hint,
  mono,
}: {
  icon: typeof Server;
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
}) {
  return (
    <div className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,9rem)_1fr] sm:items-start sm:gap-4">
      <dt className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
        {label}
      </dt>
      <dd className="min-w-0">
        <p className={`text-sm font-medium ${mono ? 'break-all font-mono text-[12px]' : ''}`}>{value}</p>
        {hint && <p className="mt-0.5 text-[11px] text-[var(--muted)]">{hint}</p>}
      </dd>
    </div>
  );
}

function LimitCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)]/70 bg-[var(--bg-elevated)]/35 px-3 py-3">
      <div className="mb-1 flex items-center gap-2 text-[11px] font-medium text-[var(--muted)]">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
