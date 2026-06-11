import { AdminLayout, Page } from '../../components/Layout';
import { DashboardSkeleton } from '../../components/ui';
import { DashboardView } from './dashboard/DashboardView';
import { useAdminDashboard } from './dashboard/useAdminDashboard';

export function AdminDashboard() {
  const ctrl = useAdminDashboard();

  if (ctrl.loading) {
    return (
      <AdminLayout>
        <Page>
          <DashboardSkeleton />
        </Page>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <DashboardView ctrl={ctrl} />
    </AdminLayout>
  );
}
