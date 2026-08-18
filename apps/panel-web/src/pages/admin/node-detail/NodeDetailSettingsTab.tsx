import { NodeSettingsDashboard } from '../../../components/admin/node-detail/settings/NodeSettingsDashboard';
import type { NodeDetailController } from './useNodeDetail';

export function NodeDetailSettingsTab({ ctrl }: { ctrl: NodeDetailController }) {
  if (!ctrl.detail) return null;

  return (
    <NodeSettingsDashboard
      ctrl={{
        detail: ctrl.detail,
        form: ctrl.form,
        setForm: ctrl.setForm,
        locations: ctrl.locations,
        saving: ctrl.saving,
        error: ctrl.error,
        saved: ctrl.saved,
        hasChanges: ctrl.hasChanges,
        confirmDelete: ctrl.confirmDelete,
        setConfirmDelete: ctrl.setConfirmDelete,
        confirmRotate: ctrl.confirmRotate,
        setConfirmRotate: ctrl.setConfirmRotate,
        copied: ctrl.copied,
        resetForm: ctrl.resetForm,
        downloadConfig: ctrl.downloadConfig,
        rotateToken: ctrl.rotateToken,
        deleteNode: ctrl.deleteNode,
        copyText: ctrl.copyText,
      }}
    />
  );
}
