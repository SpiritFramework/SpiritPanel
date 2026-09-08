import { PenLine } from 'lucide-react';
import { Input, Textarea } from '../../Layout';

export function SettingsGeneralPanel({
  name,
  description,
  canEdit,
  onNameChange,
  onDescriptionChange,
  onSubmit,
}: {
  name: string;
  description: string;
  canEdit: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <section className="ds-srv-set-panel">
      <div className="ds-srv-set-panel-head">
        <PenLine className="h-4 w-4" aria-hidden />
        <div>
          <h3 className="ds-srv-set-panel-title">General</h3>
          <p className="ds-srv-set-panel-meta">Display name and description shown in your server list</p>
        </div>
      </div>

      <div className="ds-srv-set-panel-body">
        {!canEdit ? (
          <p className="ds-srv-set-notice-inline">You do not have permission to change these settings.</p>
        ) : (
          <form
            className="ds-srv-set-form"
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
          >
            <Input
              label="Server name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="My Minecraft Server"
              required
              maxLength={191}
            />
            <Textarea
              label="Description"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Optional note about this server…"
              maxLength={500}
              rows={3}
            />
          </form>
        )}
      </div>
    </section>
  );
}
