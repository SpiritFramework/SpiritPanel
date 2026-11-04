import { Variable } from 'lucide-react';
import { EggVariablesEditor } from '../../EggVariablesEditor';
import { EggDetailPanel } from './EggDetailShell';
import type { EggDetailController } from '../../../pages/admin/egg-detail/useEggDetail';

export function EggVariablesDashboard({ ctrl }: { ctrl: EggDetailController }) {
  const { detail, updateVariables } = ctrl;
  if (!detail) return null;

  const viewable = detail.variables.filter((v) => v.userViewable).length;
  const editable = detail.variables.filter((v) => v.userEditable).length;

  return (
    <div className="ds-egg-vars">
      <EggDetailPanel
        tone="capacity"
        icon={Variable}
        eyebrow="Environment"
        title="Startup variables"
        description="Environment keys exposed on the server Startup tab. Save here is separate from Manage."
        badge={String(detail.variables.length)}
      >
        <p className="ds-egg-empty-inline ds-ud-empty-inline mb-3">
          {detail.variables.length} total · {viewable} viewable · {editable} editable by users
        </p>
        <EggVariablesEditor eggId={detail.id} variables={detail.variables} onSaved={updateVariables} />
      </EggDetailPanel>
    </div>
  );
}
