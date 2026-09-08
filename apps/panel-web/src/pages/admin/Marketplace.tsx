import { Navigate } from 'react-router-dom';

/** Legacy route — redirects admins to the new Plugins hub. */
export function AdminMarketplacePage() {
  return <Navigate to="/admin/plugins/fivem-marketplace" replace />;
}
