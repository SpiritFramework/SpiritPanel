import type { Dispatch, SetStateAction } from 'react';
import {
  AlertTriangle,
  Copy,
  Fingerprint,
  ImageIcon,
  MapPin,
  Network,
  RotateCcw,
  Save,
  Server,
  Trash2,
} from 'lucide-react';
import type { AdminLocationDetail, UpdateAdminLocationInput } from '../../../lib/api';
import { LocationFlag } from '../../LocationFlag';
import { Button, Input } from '../../Layout';
import { LocationOverviewSection } from './LocationDetailShell';

export type LocationSettingsController = {
  detail: AdminLocationDetail;
  form: UpdateAdminLocationInput;
  setForm: Dispatch<SetStateAction<UpdateAdminLocationInput>>;
  saving: boolean;
  error: string;
  saved: boolean;
  hasChanges: boolean;
  confirmDelete: boolean;
  setConfirmDelete: (value: boolean) => void;
  copied: 'id' | 'uuid' | null;
  resetForm: () => void;
  deleteLocation: () => Promise<void>;
  copyText: (text: string, key: 'id' | 'uuid') => Promise<void>;
};

export function LocationSettingsDashboard({ ctrl }: { ctrl: LocationSettingsController }) {
  const {
    detail,
    form,
    setForm,
    saving,
    error,
    saved,
    hasChanges,
    confirmDelete,
    setConfirmDelete,
    copied,
    resetForm,
    deleteLocation,
    copyText,
  } = ctrl;

  const avgServers =
    detail.nodeCount > 0 ? (detail.serverCount / detail.nodeCount).toFixed(1) : '—';
  const portTotal = detail.nodes.reduce((sum, n) => sum + n.allocationCount, 0);

  return (
    <div className="ds-nd-st">
      <div className="ds-nd-st-grid">
        <div className="ds-nd-st-main">
          <LocationOverviewSection
            icon={MapPin}
            title="Identity"
            description="Short code and display name shown across the panel"
          >
            <div className="ds-nd-st-fields">
              <Input
                label="Short code"
                value={form.short ?? ''}
                onChange={(e) => setForm({ ...form, short: e.target.value.toLowerCase() })}
                required
                maxLength={32}
                placeholder="us-east"
              />
              <Input
                label="Display name"
                value={form.long ?? ''}
                onChange={(e) => setForm({ ...form, long: e.target.value })}
                required
                placeholder="US East (New York)"
              />
            </div>
            <p className="ds-text-xs ds-text-muted mt-3">
              The short code appears on node cards and filters. Changing it updates badges everywhere
              this location is referenced.
            </p>
          </LocationOverviewSection>

          <LocationOverviewSection
            icon={ImageIcon}
            title="Branding"
            description="Optional flag image for region badges"
          >
            <div className="ds-nd-st-fields ds-nd-st-fields-span">
              <Input
                label="Flag image URL"
                value={form.flagUrl ?? ''}
                onChange={(e) => setForm({ ...form, flagUrl: e.target.value })}
                placeholder="https://flagcdn.com/w40/us.png"
                type="url"
              />
            </div>
            {form.flagUrl?.trim() ? (
              <div className="ds-loc-flag-preview">
                <LocationFlag url={form.flagUrl} size="lg" />
                <div className="min-w-0">
                  <p className="ds-text-xs font-medium">Preview</p>
                  <p className="ds-text-xs ds-text-muted truncate">{form.flagUrl}</p>
                </div>
              </div>
            ) : (
              <p className="ds-text-xs ds-text-muted">
                Leave empty to show the default map pin on location rows and node region badges.
              </p>
            )}
          </LocationOverviewSection>

          <LocationOverviewSection
            icon={Trash2}
            title="Danger zone"
            description="Permanently remove this location"
          >
            {!confirmDelete ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="ds-text-xs ds-text-muted">
                  {detail.nodeCount > 0
                    ? 'Remove or reassign all nodes before deleting this location.'
                    : 'This action cannot be undone.'}
                </p>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={detail.nodeCount > 0}
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Delete location
                </Button>
              </div>
            ) : (
              <div className="ds-nd-st-notice ds-nd-st-notice--warn">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                <div>
                  <p className="font-medium">Delete {detail.short}?</p>
                  <p className="mt-1 opacity-90">
                    This permanently removes the location record from the panel.
                  </p>
                  <div className="mt-3 flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      disabled={saving}
                      onClick={() => void deleteLocation()}
                    >
                      {saving ? 'Deleting…' : 'Confirm delete'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </LocationOverviewSection>
        </div>

        <div className="ds-nd-st-rail">
          <LocationOverviewSection
            icon={Fingerprint}
            title="Identifiers"
            description="Internal panel references"
          >
            <dl className="ds-loc-id-list">
              <div className="ds-loc-id-row">
                <dt>Short code</dt>
                <dd className="ds-text-mono">{detail.short}</dd>
              </div>
              <div className="ds-loc-id-row">
                <dt>Internal ID</dt>
                <dd className="ds-text-mono truncate" title={detail.id}>
                  {detail.id}
                </dd>
              </div>
              <div className="ds-loc-id-row">
                <dt>UUID</dt>
                <dd className="ds-text-mono truncate" title={detail.uuid}>
                  {detail.uuid}
                </dd>
              </div>
            </dl>
            <div className="ds-loc-id-actions">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void copyText(detail.id, 'id')}
              >
                <Copy className="h-3.5 w-3.5" aria-hidden />
                {copied === 'id' ? 'Copied ID' : 'Copy ID'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void copyText(detail.uuid, 'uuid')}
              >
                <Copy className="h-3.5 w-3.5" aria-hidden />
                {copied === 'uuid' ? 'Copied UUID' : 'Copy UUID'}
              </Button>
            </div>
          </LocationOverviewSection>

          <LocationOverviewSection
            icon={Network}
            title="Fleet snapshot"
            description="Nodes assigned to this region"
            badge={String(detail.nodeCount)}
          >
            <div className="ds-loc-fleet-stats">
              <div className="ds-loc-fleet-stat">
                <Server className="h-3.5 w-3.5" aria-hidden />
                <span>
                  <strong>{detail.serverCount}</strong> servers
                </span>
              </div>
              <div className="ds-loc-fleet-stat">
                <Network className="h-3.5 w-3.5" aria-hidden />
                <span>
                  <strong>{portTotal}</strong> ports
                </span>
              </div>
              <div className="ds-loc-fleet-stat">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                <span>
                  <strong>{avgServers}</strong> avg servers / node
                </span>
              </div>
            </div>
            {detail.nodeCount === 0 ? (
              <p className="ds-text-xs ds-text-muted">No nodes are assigned to this region yet.</p>
            ) : (
              <ul className="ds-loc-fleet-mini">
                {detail.nodes.slice(0, 4).map((node) => (
                  <li key={node.id} className="ds-loc-fleet-mini-row">
                    <span className="truncate font-medium">{node.name}</span>
                    <span className="ds-text-mono ds-text-muted shrink-0">
                      {node.serverCount} srv
                    </span>
                  </li>
                ))}
                {detail.nodes.length > 4 ? (
                  <li className="ds-text-xs ds-text-muted">+{detail.nodes.length - 4} more</li>
                ) : null}
              </ul>
            )}
          </LocationOverviewSection>
        </div>
      </div>

      <div
        className={`ds-nd-st-savebar${hasChanges ? ' ds-nd-st-savebar--dirty' : saved ? ' ds-nd-st-savebar--saved' : ''}`}
        role="status"
      >
        <div className="ds-nd-st-savebar-status">
          {error ? (
            <span className="ds-nd-st-savebar-msg ds-nd-st-savebar-msg--error">{error}</span>
          ) : saved ? (
            <span className="ds-nd-st-savebar-msg ds-nd-st-savebar-msg--success">Changes saved</span>
          ) : hasChanges ? (
            <span className="ds-nd-st-savebar-msg">
              <span className="ds-nd-st-savebar-dot" aria-hidden />
              Unsaved changes
            </span>
          ) : (
            <span className="ds-nd-st-savebar-msg ds-nd-st-savebar-msg--idle">All changes saved</span>
          )}
        </div>
        <div className="ds-nd-st-savebar-actions">
          <Button type="button" variant="ghost" size="sm" onClick={resetForm} disabled={!hasChanges || saving}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Reset
          </Button>
          <Button type="submit" size="sm" disabled={saving || !hasChanges}>
            <Save className="h-3.5 w-3.5" aria-hidden />
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
