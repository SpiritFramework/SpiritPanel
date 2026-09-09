import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BrandingProvider } from './context/BrandingContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { RequireAdmin, RequireAuth, RequireFullAdmin } from './components/RequireAuth';
import { RequireServerPermission } from './components/RequireServerPermission';
import { CommandPalette } from './components/CommandPalette';
import { ServiceUnavailable } from './components/ServiceUnavailable';
import { PwaUpdateBanner } from './components/PwaUpdateBanner';
import { PageLoading } from './components/ui';

const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('./pages/SignupPage').then((m) => ({ default: m.SignupPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard').then((m) => ({ default: m.AdminDashboard })));
const AdminUsers = lazy(() => import('./pages/admin/Users').then((m) => ({ default: m.AdminUsers })));
const AdminUserDetail = lazy(() => import('./pages/admin/UserDetail').then((m) => ({ default: m.AdminUserDetail })));
const AdminNodes = lazy(() => import('./pages/admin/Nodes').then((m) => ({ default: m.AdminNodes })));
const AdminNodeCreate = lazy(() => import('./pages/admin/NodeCreate').then((m) => ({ default: m.AdminNodeCreate })));
const AdminNodeDetail = lazy(() => import('./pages/admin/NodeDetail').then((m) => ({ default: m.AdminNodeDetail })));
const AdminServers = lazy(() => import('./pages/admin/Servers').then((m) => ({ default: m.AdminServers })));
const AdminServerCreate = lazy(() => import('./pages/admin/ServerCreate').then((m) => ({ default: m.AdminServerCreate })));
const AdminServerDetail = lazy(() => import('./pages/admin/ServerDetail').then((m) => ({ default: m.AdminServerDetail })));
const AdminConsoleRedirect = lazy(() => import('./pages/admin/AdminConsoleRedirect').then((m) => ({ default: m.AdminConsoleRedirect })));
const AdminServerManageShell = lazy(() => import('./pages/admin/ServerManage').then((m) => ({ default: m.AdminServerManageShell })));
const AdminNests = lazy(() => import('./pages/admin/Nests').then((m) => ({ default: m.AdminNests })));
const AdminNestDetail = lazy(() => import('./pages/admin/NestDetail').then((m) => ({ default: m.AdminNestDetail })));
const AdminEggDetail = lazy(() => import('./pages/admin/EggDetail').then((m) => ({ default: m.AdminEggDetail })));
const AdminLocations = lazy(() => import('./pages/admin/Locations').then((m) => ({ default: m.AdminLocations })));
const AdminLocationDetail = lazy(() => import('./pages/admin/LocationDetail').then((m) => ({ default: m.AdminLocationDetail })));
const AdminActivity = lazy(() => import('./pages/admin/Activity').then((m) => ({ default: m.AdminActivity })));
const AdminAnnouncePage = lazy(() => import('./pages/admin/Announce').then((m) => ({ default: m.AdminAnnouncePage })));
const AdminSettings = lazy(() => import('./pages/admin/Settings').then((m) => ({ default: m.AdminSettings })));
const AdminDomainsPage = lazy(() => import('./pages/admin/AdminDomains').then((m) => ({ default: m.AdminDomainsPage })));
const ServerListPage = lazy(() => import('./pages/client/ServerList').then((m) => ({ default: m.ServerListPage })));
const ServerConsolePage = lazy(() => import('./pages/client/ServerConsole').then((m) => ({ default: m.ServerConsolePage })));
const ServerFilesPage = lazy(() => import('./pages/client/ServerFiles').then((m) => ({ default: m.ServerFilesPage })));
const ServerFileEditPage = lazy(() => import('./pages/client/ServerFileEdit').then((m) => ({ default: m.ServerFileEditPage })));
const ServerStartupPage = lazy(() => import('./pages/client/ServerStartup').then((m) => ({ default: m.ServerStartupPage })));
const ServerSubusersPage = lazy(() => import('./pages/client/ServerSubusers').then((m) => ({ default: m.ServerSubusersPage })));
const ServerSettingsPage = lazy(() => import('./pages/client/ServerSettings').then((m) => ({ default: m.ServerSettingsPage })));
const ServerActivityPage = lazy(() => import('./pages/client/ServerActivity').then((m) => ({ default: m.ServerActivityPage })));
const ServerAnalyticsPage = lazy(() => import('./pages/client/ServerAnalytics').then((m) => ({ default: m.ServerAnalyticsPage })));
const ServerNetworkPage = lazy(() => import('./pages/client/ServerNetwork').then((m) => ({ default: m.ServerNetworkPage })));
const ServerDatabasesPage = lazy(() => import('./pages/client/ServerDatabases').then((m) => ({ default: m.ServerDatabasesPage })));
const ServerBackupsPage = lazy(() => import('./pages/client/ServerBackups').then((m) => ({ default: m.ServerBackupsPage })));
const ServerSchedulesPage = lazy(() => import('./pages/client/ServerSchedules').then((m) => ({ default: m.ServerSchedulesPage })));
const MarketplaceRoutes = lazy(() => import('./pages/client/MarketplaceRoutes').then((m) => ({ default: m.MarketplaceRoutes })));
const PluginsRoutes = lazy(() => import('./pages/client/PluginsRoutes').then((m) => ({ default: m.PluginsRoutes })));
const AdminMarketplacePage = lazy(() => import('./pages/admin/Marketplace').then((m) => ({ default: m.AdminMarketplacePage })));
const AdminPluginsPage = lazy(() => import('./pages/admin/Plugins').then((m) => ({ default: m.AdminPluginsPage })));
const AdminFivemMarketplacePluginPage = lazy(() =>
  import('./pages/admin/FivemMarketplacePlugin').then((m) => ({ default: m.AdminFivemMarketplacePluginPage })),
);
const AdminMinecraftPluginsPage = lazy(() =>
  import('./pages/admin/MinecraftPlugins').then((m) => ({ default: m.AdminMinecraftPluginsPage })),
);
const AdminDatabaseManagerPage = lazy(() =>
  import('./pages/admin/DatabaseManager').then((m) => ({ default: m.AdminDatabaseManagerPage })),
);
const AdminTicketsPage = lazy(() => import('./pages/admin/Tickets').then((m) => ({ default: m.AdminTicketsPage })));
const AdminTicketDetailPage = lazy(() => import('./pages/admin/TicketDetail').then((m) => ({ default: m.AdminTicketDetailPage })));
const ProfilePage = lazy(() => import('./pages/client/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const TicketsPage = lazy(() => import('./pages/client/Tickets').then((m) => ({ default: m.TicketsPage })));
const TicketDetailPage = lazy(() => import('./pages/client/TicketDetail').then((m) => ({ default: m.TicketDetailPage })));
const ServerShell = lazy(() => import('./components/ServerLayout').then((m) => ({ default: m.ServerShell })));

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <PageLoading />
    </div>
  );
}

function PanelRouter() {
  const { loading, serviceUnavailable, retryConnection } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--bg)]">
        <PageLoading label="Connecting to panel…" />
      </div>
    );
  }

  if (serviceUnavailable) {
    return <ServiceUnavailable onRetry={() => void retryConnection()} />;
  }

  return (
    <>
      <PwaUpdateBanner />
      <CommandPalette />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route element={<RequireAuth />}>
              <Route path="/servers" element={<ServerListPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/tickets" element={<TicketsPage />} />
              <Route path="/tickets/:id" element={<TicketDetailPage />} />
              <Route path="/servers/:id" element={<ServerShell />}>
                <Route index element={<Navigate to="console" replace />} />
                <Route path="console" element={<RequireServerPermission flag="canConsole"><ServerConsolePage /></RequireServerPermission>} />
                <Route path="analytics" element={<RequireServerPermission flag="canConsole"><ServerAnalyticsPage /></RequireServerPermission>} />
                <Route path="network" element={<RequireServerPermission flag="canReadAllocations"><ServerNetworkPage /></RequireServerPermission>} />
                <Route path="files" element={<RequireServerPermission flag="canReadFiles"><ServerFilesPage /></RequireServerPermission>} />
                <Route path="files/edit" element={<RequireServerPermission flag="canReadFiles"><ServerFileEditPage /></RequireServerPermission>} />
                <Route path="backups" element={<RequireServerPermission flag="canReadBackups"><ServerBackupsPage /></RequireServerPermission>} />
                <Route path="schedules" element={<RequireServerPermission flag="canReadSchedules"><ServerSchedulesPage /></RequireServerPermission>} />
                <Route path="databases" element={<RequireServerPermission flag="canReadDatabases"><ServerDatabasesPage /></RequireServerPermission>} />
                <Route path="startup" element={<RequireServerPermission flag="canReadStartup"><ServerStartupPage /></RequireServerPermission>} />
                <Route path="users" element={<RequireServerPermission flag="canManageSubusers"><ServerSubusersPage /></RequireServerPermission>} />
                <Route path="settings" element={<RequireServerPermission flag="canUpdateSettings"><ServerSettingsPage /></RequireServerPermission>} />
                <Route path="activity" element={<ServerActivityPage />} />
                <Route path="marketplace/*" element={<RequireServerPermission flag="canReadFiles"><MarketplaceRoutes /></RequireServerPermission>} />
                <Route path="plugins/*" element={<RequireServerPermission flag="canReadFiles"><PluginsRoutes /></RequireServerPermission>} />
              </Route>
              <Route element={<RequireAdmin />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/users/:userId" element={<AdminUserDetail />} />
                <Route path="/admin/nodes" element={<AdminNodes />} />
                <Route path="/admin/servers" element={<AdminServers />} />
                <Route path="/admin/servers/:serverId" element={<AdminServerDetail />} />
                <Route path="/admin/nests" element={<AdminNests />} />
                <Route path="/admin/nests/:nestId" element={<AdminNestDetail />} />
                <Route path="/admin/eggs/:eggId" element={<AdminEggDetail />} />
                <Route path="/admin/locations" element={<AdminLocations />} />
                <Route path="/admin/locations/:locationId" element={<AdminLocationDetail />} />
                <Route path="/admin/activity" element={<AdminActivity />} />
                <Route path="/admin/domains" element={<AdminDomainsPage />} />
                <Route path="/admin/announce" element={<AdminAnnouncePage />} />
                <Route path="/admin/tickets" element={<AdminTicketsPage />} />
                <Route path="/admin/tickets/:id" element={<AdminTicketDetailPage />} />
                <Route element={<RequireFullAdmin />}>
                  <Route path="/admin/nodes/new" element={<AdminNodeCreate />} />
                  <Route path="/admin/servers/new" element={<AdminServerCreate />} />
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
                    <Route path="plugins/*" element={<PluginsRoutes />} />
                  </Route>
                  <Route path="/admin/settings" element={<AdminSettings />} />
                  <Route path="/admin/plugins" element={<AdminPluginsPage />} />
                  <Route path="/admin/plugins/fivem-marketplace" element={<AdminFivemMarketplacePluginPage />} />
                  <Route path="/admin/plugins/minecraft-plugins" element={<AdminMinecraftPluginsPage />} />
                  <Route path="/admin/plugins/database-manager" element={<AdminDatabaseManagerPage />} />
                  <Route path="/admin/marketplace" element={<AdminMarketplacePage />} />
                </Route>
                <Route path="/admin/nodes/:nodeId" element={<AdminNodeDetail />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/servers" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
      <BrandingProvider>
        <AuthProvider>
        <BrowserRouter>
          <PanelRouter />
        </BrowserRouter>
        </AuthProvider>
      </BrandingProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
