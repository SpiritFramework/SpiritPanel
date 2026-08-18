import { Route, Routes } from 'react-router-dom';
import { ServerPluginsPage } from './ServerPlugins';
import { MinecraftPluginProjectPage } from './MinecraftPluginProject';

export function PluginsRoutes() {
  return (
    <Routes>
      <Route index element={<ServerPluginsPage />} />
      <Route path="project/:slug" element={<MinecraftPluginProjectPage />} />
    </Routes>
  );
}
