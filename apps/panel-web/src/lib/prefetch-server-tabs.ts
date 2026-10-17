/** Map server-tab path segments to their lazy page chunks. */
const TAB_LOADERS: Record<string, () => Promise<unknown>> = {
  console: () => import('../pages/client/ServerConsole'),
  analytics: () => import('../pages/client/ServerAnalytics'),
  activity: () => import('../pages/client/ServerActivity'),
  files: () => import('../pages/client/ServerFiles'),
  network: () => import('../pages/client/ServerNetwork'),
  settings: () => import('../pages/client/ServerSettings'),
  startup: () => import('../pages/client/ServerStartup'),
  users: () => import('../pages/client/ServerSubusers'),
  databases: () => import('../pages/client/ServerDatabases'),
  backups: () => import('../pages/client/ServerBackups'),
  schedules: () => import('../pages/client/ServerSchedules'),
  plugins: () => import('../pages/client/PluginsRoutes'),
  marketplace: () => import('../pages/client/MarketplaceRoutes'),
};

const warmed = new Set<string>();

/** Warm a server-tab chunk (safe to call from hover / idle). */
export function prefetchServerTab(tab: string) {
  const key = tab.replace(/^\//, '').split('/')[0] || '';
  if (!key || warmed.has(key)) return;
  const load = TAB_LOADERS[key];
  if (!load) return;
  warmed.add(key);
  void load().catch(() => {
    warmed.delete(key);
  });
}

/** Warm the most-used tabs after the shell is up. */
export function prefetchCommonServerTabs() {
  for (const tab of ['console', 'analytics', 'activity', 'files', 'network', 'settings', 'plugins']) {
    prefetchServerTab(tab);
  }
}
