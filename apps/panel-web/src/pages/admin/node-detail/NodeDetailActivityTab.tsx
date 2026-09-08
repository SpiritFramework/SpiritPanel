import type { AdminNodeDetail } from '../../../lib/api';
import { NodeActivityDashboard } from '../../../components/admin/node-detail/activity/NodeActivityDashboard';

export function NodeDetailActivityTab({ detail }: { detail: AdminNodeDetail }) {
  return <NodeActivityDashboard detail={detail} />;
}
