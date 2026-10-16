import { AdminLayout, Page } from '../../components/Layout';
import { AdminDashboard as AdminDashboardView } from '../../components/admin/dashboard/AdminDashboard';
import { DashboardSkeleton } from '../../components/ui';
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
      <AdminDashboardView ctrl={ctrl} />
    </AdminLayout>
  );
}
