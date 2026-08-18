import { NodeOverviewDashboard } from '../../../components/admin/node-detail/overview/NodeOverviewDashboard';
import type { NodeDetailController } from './useNodeDetail';

export function NodeDetailOverviewTab({
  ctrl,
  onDiagnostics,
  onAllocations,
  onServers,
  onAnalytics,
}: {
  ctrl: NodeDetailController;
  onDiagnostics: () => void;
  onAllocations: () => void;
  onServers: () => void;
  onAnalytics: () => void;
}) {
  const { detail, copied, copyText, downloadConfig } = ctrl;
  if (!detail) return null;

  return (
    <NodeOverviewDashboard
      detail={detail}
      nav={{
        onDiagnostics,
        onAllocations,
        onServers,
        onAnalytics,
        downloadConfig,
        copyText: (text) => void copyText(text),
        copied,
      }}
    />
  );
}
