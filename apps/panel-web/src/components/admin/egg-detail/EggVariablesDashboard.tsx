import { Variable } from 'lucide-react';
import { EggVariablesEditor } from '../../EggVariablesEditor';
import { EggDetailPanel } from './EggDetailShell';
import type { EggDetailController } from '../../../pages/admin/egg-detail/useEggDetail';

export function EggVariablesDashboard({ ctrl }: { ctrl: EggDetailController }) {
  const { detail, updateVariables } = ctrl;
  if (!detail) return null;

  return (
    <div className="ds-egg-vars">
      <EggDetailPanel
        icon={Variable}
        title="Startup variables"
        description="Environment keys exposed on the server Startup tab. Save here is separate from Manage."
        badge={String(detail.variables.length)}
      >
        <EggVariablesEditor eggId={detail.id} variables={detail.variables} onSaved={updateVariables} />
      </EggDetailPanel>
    </div>
  );
}
