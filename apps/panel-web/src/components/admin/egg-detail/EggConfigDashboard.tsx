import { Box, Egg, Server, Terminal, Upload } from 'lucide-react';
import { Textarea } from '../../Layout';
import { AdminToolButton } from '../primitives';
import { EggDetailPanel } from './EggDetailShell';
import type { EggDetailController } from '../../../pages/admin/egg-detail/useEggDetail';

export function EggConfigDashboard({ ctrl }: { ctrl: EggDetailController }) {
  const {
    detail,
    dockerImageEntries,
    reimportJson,
    setReimportJson,
    reimporting,
    reimportError,
    reimported,
    setReimported,
    setReimportError,
    reimport,
    onReimportFile,
  } = ctrl;

  if (!detail) return null;

  return (
    <div className="ds-egg-config">
      <EggDetailPanel
        tone="identity"
        icon={Egg}
        eyebrow="Import"
        title="Re-import egg"
        description="Update scripts, docker images, and variables from a Pterodactyl egg export"
        actions={
          <label className="ds-egg-upload-btn">
            <Upload className="h-3.5 w-3.5" aria-hidden />
            Upload JSON
            <input type="file" accept=".json,application/json" className="hidden" onChange={onReimportFile} />
          </label>
        }
      >
        <p className="ds-egg-reimport-hint ds-ud-empty-inline mb-3">
          Upload an <code>egg-*.json</code> file or paste the export below.
        </p>
        <Textarea
          label="Egg JSON"
          value={reimportJson}
          onChange={(e) => {
            setReimportJson(e.target.value);
            setReimported(false);
            setReimportError('');
          }}
          rows={6}
          placeholder='{ "meta": { "version": "PTDL_v2" }, "name": "..." }'
          className="font-mono text-[11px]"
        />
        {reimportError ? <p className="ds-egg-form-error">{reimportError}</p> : null}
        {reimported ? <p className="ds-egg-form-success">Egg updated from JSON</p> : null}
        <div className="ds-egg-reimport-submit">
          <AdminToolButton
            type="button"
            primary
            disabled={!reimportJson.trim() || reimporting}
            onClick={() => void reimport()}
          >
            {reimporting ? 'Updating…' : 'Update from JSON'}
          </AdminToolButton>
        </div>
      </EggDetailPanel>

      <EggDetailPanel
        tone="wings"
        icon={Terminal}
        eyebrow="Runtime"
        title="Startup command"
        description="Command executed when the server starts"
      >
        <pre className="ds-egg-code-block">{detail.startup}</pre>
        <p className="ds-egg-code-hint">
          Stop signal: <code>{detail.configStop}</code>
        </p>
      </EggDetailPanel>

      <EggDetailPanel
        tone="capacity"
        icon={Box}
        eyebrow="Containers"
        title="Docker images"
        description="Available container images"
        badge={String(dockerImageEntries.length)}
      >
        {dockerImageEntries.length === 0 ? (
          <p className="ds-egg-empty-inline ds-ud-empty-inline">No docker images configured.</p>
        ) : (
          <ul className="ds-egg-image-list">
            {dockerImageEntries.map(([label, image]) => (
              <li key={label} className="ds-egg-image-card">
                <p className="ds-egg-image-label">{label}</p>
                <p className="ds-egg-image-value">{image}</p>
              </li>
            ))}
          </ul>
        )}
      </EggDetailPanel>

      {detail.features.length > 0 ? (
        <EggDetailPanel tone="trends" icon={Server} eyebrow="Capabilities" title="Features">
          <div className="ds-egg-feature-tags">
            {detail.features.map((f) => (
              <span key={f} className="ds-egg-feature-tag">
                {f}
              </span>
            ))}
          </div>
        </EggDetailPanel>
      ) : null}

      <EggDetailPanel
        tone="connection"
        icon={Box}
        eyebrow="Provisioning"
        title="Install script"
        description="Container and entrypoint for provisioning"
      >
        <dl className="ds-egg-install-meta">
          <div>
            <dt>Container</dt>
            <dd className="ds-text-mono">{detail.scriptContainer}</dd>
          </div>
          <div>
            <dt>Entry</dt>
            <dd className="ds-text-mono">{detail.scriptEntry}</dd>
          </div>
          <div>
            <dt>Privileged</dt>
            <dd>{detail.scriptPrivileged ? 'Yes' : 'No'}</dd>
          </div>
          {detail.updateUrl ? (
            <div className="ds-egg-install-wide">
              <dt>Update URL</dt>
              <dd className="ds-text-mono truncate">{detail.updateUrl}</dd>
            </div>
          ) : null}
        </dl>
        {detail.scriptInstall ? (
          <pre className="ds-egg-code-block ds-egg-code-block--scroll">{detail.scriptInstall}</pre>
        ) : (
          <p className="ds-egg-empty-inline ds-ud-empty-inline mt-3">No install script on this egg.</p>
        )}
      </EggDetailPanel>
    </div>
  );
}
