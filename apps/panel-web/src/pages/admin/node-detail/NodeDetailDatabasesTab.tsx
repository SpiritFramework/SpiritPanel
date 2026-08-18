import { Database } from 'lucide-react';
import { DatabaseHostsPanel } from '../../../components/DatabaseHostsPanel';
import { NodeDetailPanel } from '../../../components/admin/node-detail/NodeDetailPanel';

export function NodeDetailDatabasesTab({ nodeId, nodeFqdn }: { nodeId: string; nodeFqdn: string }) {
  return (
    <div className="ds-nd-body">
      <NodeDetailPanel
        title="Database hosts"
        description="MySQL hosts available for servers on this node"
        icon={Database}
      >
        <DatabaseHostsPanel nodeId={nodeId} nodeFqdn={nodeFqdn} />
      </NodeDetailPanel>
    </div>
  );
}
