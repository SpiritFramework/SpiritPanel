import { Card } from '../../Layout';
import { EggVariablesEditor } from '../../EggVariablesEditor';
import type { EggDetailController } from '../../../pages/admin/egg-detail/useEggDetail';

export function EggVariablesDashboard({ ctrl }: { ctrl: EggDetailController }) {
  const { detail, load } = ctrl;
  if (!detail) return null;

  return (
    <div className="ds-egg-vars">
      <Card title={`Variables (${detail.variables.length})`}>
        <EggVariablesEditor eggId={detail.id} variables={detail.variables} onSaved={load} />
      </Card>
    </div>
  );
}
