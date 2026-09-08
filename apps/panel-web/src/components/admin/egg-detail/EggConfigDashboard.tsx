import { Box, Egg, Server, Terminal } from 'lucide-react';
import { Button, Textarea } from '../../Layout';
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
        icon={Egg}
        title="Re-import egg"
        description="Update scripts, docker images, and variables from a Pterodactyl egg export"
      >
        <div className="ds-egg-reimport-actions">
          <label className="ds-egg-upload-btn">
            Upload egg-*.json
            <input type="file" accept=".json,application/json" className="hidden" onChange={onReimportFile} />
          </label>
          <span className="ds-egg-reimport-hint">or paste JSON below</span>
        </div>
        <div className="ds-egg-form-spacer">
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
        </div>
        {reimportError ? <p className="ds-egg-form-error">{reimportError}</p> : null}
        {reimported ? <p className="ds-egg-form-success">Egg updated from JSON</p> : null}
        <div className="ds-egg-reimport-submit">
          <Button type="button" disabled={!reimportJson.trim() || reimporting} onClick={() => void reimport()}>
            {reimporting ? 'Updating…' : 'Update from JSON'}
          </Button>
        </div>
      </EggDetailPanel>

      <EggDetailPanel
        icon={Terminal}
        title="Startup command"
        description="Command executed when the server starts"
      >
        <pre className="ds-egg-code-block">{detail.startup}</pre>
        <p className="ds-egg-code-hint">
          Stop signal: <code>{detail.configStop}</code>
        </p>
      </EggDetailPanel>

      <EggDetailPanel icon={Box} title="Docker images" description="Available container images">
        {dockerImageEntries.length === 0 ? (
          <p className="ds-egg-empty-inline">No docker images configured.</p>
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
        <EggDetailPanel icon={Server} title="Features">
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
        icon={Box}
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
        ) : null}
      </EggDetailPanel>
    </div>
  );
}
