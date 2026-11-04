import { useCallback, useState, type ReactNode } from 'react';
import { Database } from 'lucide-react';
import { DatabaseHostsPanel } from '../../../components/DatabaseHostsPanel';
import { NodeDetailPanel } from '../../../components/admin/node-detail/NodeDetailPanel';

export function NodeDetailDatabasesTab({ nodeId, nodeFqdn }: { nodeId: string; nodeFqdn: string }) {
  const [actions, setActions] = useState<ReactNode>(null);
  const onActionsChange = useCallback((next: ReactNode | null) => {
    setActions(next);
  }, []);

  return (
    <div className="ds-nd-body">
      <NodeDetailPanel
        title="Database hosts"
        description="MySQL hosts available for servers on this node"
        icon={Database}
        actions={actions}
      >
        <DatabaseHostsPanel
          nodeId={nodeId}
          nodeFqdn={nodeFqdn}
          embedded
          onActionsChange={onActionsChange}
        />
      </NodeDetailPanel>
    </div>
  );
}
