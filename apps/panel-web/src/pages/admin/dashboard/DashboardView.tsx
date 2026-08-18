import { AdminDashboard } from '../../../components/admin/dashboard/AdminDashboard';
import type { AdminDashboardController } from './useAdminDashboard';

export function DashboardView({ ctrl }: { ctrl: AdminDashboardController }) {
  return <AdminDashboard ctrl={ctrl} />;
}
