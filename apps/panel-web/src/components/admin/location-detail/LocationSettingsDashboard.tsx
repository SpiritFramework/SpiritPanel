import type { Dispatch, SetStateAction } from 'react';
import { AlertTriangle, ImageIcon, MapPin, Trash2 } from 'lucide-react';
import type { AdminLocationDetail, UpdateAdminLocationInput } from '../../../lib/api';
import { LocationFlag } from '../../LocationFlag';
import { Button, Input } from '../../Layout';
import { LocationDetailPanel } from './LocationDetailShell';

export type LocationSettingsController = {
  detail: AdminLocationDetail;
  form: UpdateAdminLocationInput;
  setForm: Dispatch<SetStateAction<UpdateAdminLocationInput>>;
  saving: boolean;
  error: string;
  hasChanges: boolean;
  confirmDelete: boolean;
  setConfirmDelete: (value: boolean) => void;
  deleteLocation: () => Promise<void>;
};

export function LocationSettingsDashboard({ ctrl }: { ctrl: LocationSettingsController }) {
  const {
    detail,
    form,
    setForm,
    saving,
    error,
    hasChanges,
    confirmDelete,
    setConfirmDelete,
    deleteLocation,
  } = ctrl;

  const canDelete = detail.nodeCount === 0;

  return (
    <div className="ds-loc-manage ds-nst-manage">
      <LocationDetailPanel
        tone="identity"
        icon={MapPin}
        eyebrow="Profile"
        title="Location details"
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
            hint="Appears on node cards and filters"
          />
          <Input
            label="Display name"
            value={form.long ?? ''}
            onChange={(e) => setForm({ ...form, long: e.target.value })}
            required
            placeholder="US East (New York)"
          />
        </div>
      </LocationDetailPanel>

      <LocationDetailPanel
        tone="connection"
        icon={ImageIcon}
        eyebrow="Appearance"
        title="Region branding"
        description="Optional flag image for location badges"
      >
        <div className="ds-nd-st-fields ds-nd-st-fields-span">
          <Input
            label="Flag image URL"
            value={form.flagUrl ?? ''}
            onChange={(e) => setForm({ ...form, flagUrl: e.target.value })}
            placeholder="https://flagcdn.com/w40/us.png"
            type="url"
            hint="Leave empty to show the default map pin"
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
        ) : null}
      </LocationDetailPanel>

      <LocationDetailPanel
        tone="danger"
        icon={Trash2}
        eyebrow="Danger zone"
        title="Delete location"
        description="Permanently remove this location"
      >
        {!confirmDelete ? (
          <div className="ds-loc-danger-row ds-nst-danger-row ds-ud-danger-row">
            <p className="ds-loc-danger-desc ds-nst-danger-desc ds-ud-danger-desc">
              {canDelete
                ? 'This permanently removes the location record. This cannot be undone.'
                : 'Remove or reassign all nodes before deleting this location.'}
            </p>
            <Button
              type="button"
              variant="danger"
              disabled={!canDelete}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Delete location
            </Button>
          </div>
        ) : (
          <div className="ds-loc-confirm-box ds-nst-confirm-box ds-nst-confirm-box--danger">
            <p className="ds-loc-confirm-text ds-nst-confirm-text">
              <AlertTriangle className="inline h-3.5 w-3.5" aria-hidden /> Delete{' '}
              <strong>{detail.short}</strong>?
            </p>
            <div className="ds-loc-confirm-actions ds-nst-confirm-actions">
              <Button type="button" variant="ghost" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={saving}
                onClick={() => void deleteLocation()}
              >
                {saving ? 'Deleting…' : 'Confirm delete'}
              </Button>
            </div>
            {error && !hasChanges ? <p className="ds-nst-form-error">{error}</p> : null}
          </div>
        )}
      </LocationDetailPanel>
    </div>
  );
}
