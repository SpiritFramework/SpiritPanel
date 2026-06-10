import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BrandingProvider } from './context/BrandingContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { RequireAdmin, RequireAuth } from './components/RequireAuth';
import { ServerShell } from './components/ServerLayout';
import { CommandPalette } from './components/CommandPalette';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminUsers } from './pages/admin/Users';
import { AdminUserDetail } from './pages/admin/UserDetail';
import { AdminNodes } from './pages/admin/Nodes';
import { AdminNodeCreate } from './pages/admin/NodeCreate';
import { AdminNodeDetail } from './pages/admin/NodeDetail';
import { AdminServers } from './pages/admin/Servers';
import { AdminServerCreate } from './pages/admin/ServerCreate';
import { AdminServerDetail } from './pages/admin/ServerDetail';
import { AdminConsoleRedirect } from './pages/admin/AdminConsoleRedirect';
import { AdminServerManageShell } from './pages/admin/ServerManage';
import { AdminNests } from './pages/admin/Nests';
import { AdminNestDetail } from './pages/admin/NestDetail';
import { AdminEggDetail } from './pages/admin/EggDetail';
import { AdminLocations } from './pages/admin/Locations';
import { AdminLocationDetail } from './pages/admin/LocationDetail';
import { AdminActivity } from './pages/admin/Activity';
import { AdminAnnouncePage } from './pages/admin/Announce';
import { AdminSettings } from './pages/admin/Settings';
import { ServerListPage } from './pages/client/ServerList';
import { ServerConsolePage } from './pages/client/ServerConsole';
import { ServerFilesPage } from './pages/client/ServerFiles';
import { ServerFileEditPage } from './pages/client/ServerFileEdit';
import { ServerStartupPage } from './pages/client/ServerStartup';
import { ServerSubusersPage } from './pages/client/ServerSubusers';
import { ServerSettingsPage } from './pages/client/ServerSettings';
import { ServerActivityPage } from './pages/client/ServerActivity';
import { ServerAnalyticsPage } from './pages/client/ServerAnalytics';
import { ServerNetworkPage } from './pages/client/ServerNetwork';
import { ServerDatabasesPage } from './pages/client/ServerDatabases';
import { ServerBackupsPage } from './pages/client/ServerBackups';
import { ServerSchedulesPage } from './pages/client/ServerSchedules';
import { MarketplaceRoutes } from './pages/client/MarketplaceRoutes';
import { AdminMarketplacePage } from './pages/admin/Marketplace';
import { ProfilePage } from './pages/client/ProfilePage';

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
      <BrandingProvider>
        <AuthProvider>
        <BrowserRouter>
          <CommandPalette />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route element={<RequireAuth />}>
              <Route path="/servers" element={<ServerListPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/servers/:id" element={<ServerShell />}>
                <Route index element={<Navigate to="console" replace />} />
                <Route path="console" element={<ServerConsolePage />} />
                <Route path="analytics" element={<ServerAnalyticsPage />} />
                <Route path="network" element={<ServerNetworkPage />} />
                <Route path="files" element={<ServerFilesPage />} />
                <Route path="files/edit" element={<ServerFileEditPage />} />
                <Route path="backups" element={<ServerBackupsPage />} />
                <Route path="schedules" element={<ServerSchedulesPage />} />
                <Route path="databases" element={<ServerDatabasesPage />} />
                <Route path="startup" element={<ServerStartupPage />} />
                <Route path="users" element={<ServerSubusersPage />} />
                <Route path="settings" element={<ServerSettingsPage />} />
                <Route path="activity" element={<ServerActivityPage />} />
                <Route path="marketplace/*" element={<MarketplaceRoutes />} />
              </Route>
              <Route element={<RequireAdmin />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/users/:userId" element={<AdminUserDetail />} />
                <Route path="/admin/nodes" element={<AdminNodes />} />
                <Route path="/admin/nodes/new" element={<AdminNodeCreate />} />
                <Route path="/admin/nodes/:nodeId" element={<AdminNodeDetail />} />
                <Route path="/admin/servers" element={<AdminServers />} />
                <Route path="/admin/servers/new" element={<AdminServerCreate />} />
                <Route path="/admin/servers/:serverId" element={<AdminServerDetail />} />
                <Route path="/admin/servers/:serverId/console" element={<AdminConsoleRedirect />} />
                <Route path="/admin/servers/:serverId/manage" element={<AdminServerManageShell />}>
                  <Route index element={<Navigate to="console" replace />} />
                  <Route path="console" element={<ServerConsolePage />} />
                  <Route path="analytics" element={<ServerAnalyticsPage />} />
                  <Route path="network" element={<ServerNetworkPage />} />
                  <Route path="files" element={<ServerFilesPage />} />
                  <Route path="files/edit" element={<ServerFileEditPage />} />
                  <Route path="backups" element={<ServerBackupsPage />} />
                  <Route path="schedules" element={<ServerSchedulesPage />} />
                  <Route path="databases" element={<ServerDatabasesPage />} />
                  <Route path="startup" element={<ServerStartupPage />} />
                  <Route path="users" element={<ServerSubusersPage />} />
                  <Route path="settings" element={<ServerSettingsPage />} />
                  <Route path="activity" element={<ServerActivityPage />} />
                  <Route path="marketplace/*" element={<MarketplaceRoutes />} />
                </Route>
                <Route path="/admin/nests" element={<AdminNests />} />
                <Route path="/admin/nests/:nestId" element={<AdminNestDetail />} />
                <Route path="/admin/eggs/:eggId" element={<AdminEggDetail />} />
                <Route path="/admin/locations" element={<AdminLocations />} />
                <Route path="/admin/locations/:locationId" element={<AdminLocationDetail />} />
                <Route path="/admin/activity" element={<AdminActivity />} />
                <Route path="/admin/announce" element={<AdminAnnouncePage />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
                <Route path="/admin/marketplace" element={<AdminMarketplacePage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/servers" replace />} />
          </Routes>
        </BrowserRouter>
        </AuthProvider>
      </BrandingProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
