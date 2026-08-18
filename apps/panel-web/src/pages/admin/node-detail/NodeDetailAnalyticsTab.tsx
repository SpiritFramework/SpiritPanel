import { NodeAnalyticsDashboard } from '../../../components/admin/node-detail/analytics/NodeAnalyticsDashboard';

export function NodeDetailAnalyticsTab({ nodeId }: { nodeId: string }) {
  return <NodeAnalyticsDashboard nodeId={nodeId} />;
}
