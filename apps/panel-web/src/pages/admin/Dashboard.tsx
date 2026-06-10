import { AdminLayout } from '../../components/Layout';
import { Spinner } from '../../components/ui';
import { DashboardView } from './dashboard/DashboardView';
import { useAdminDashboard } from './dashboard/useAdminDashboard';

export function AdminDashboard() {
  const ctrl = useAdminDashboard();

  if (ctrl.loading) {
    return (
      <AdminLayout>
        <div className="ops-loading">
          <Spinner className="h-8 w-8" />
          <p>Loading fleet data…</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <DashboardView ctrl={ctrl} />
    </AdminLayout>
  );
}
