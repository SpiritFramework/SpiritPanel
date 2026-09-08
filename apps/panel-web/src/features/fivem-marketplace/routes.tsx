import { Route, Routes } from 'react-router-dom';
import { FivemMarketplaceView } from './FivemMarketplaceView';
import { CatalogDetailPage } from './pages/CatalogDetailPage';
import { ScriptDetailPage } from './pages/ScriptDetailPage';
import { ScriptInstallPage } from './pages/ScriptInstallPage';
import { GithubBrowsePage } from './pages/GithubBrowsePage';
import { GithubSearchPage } from './pages/GithubSearchPage';

export function FivemMarketplaceRoutes() {
  return (
    <Routes>
      <Route index element={<FivemMarketplaceView />} />
      <Route path="catalog/:pluginId" element={<CatalogDetailPage />} />
      <Route path="github/browse" element={<GithubBrowsePage />} />
      <Route path="github/browse/:categoryId" element={<GithubBrowsePage />} />
      <Route path="github/search" element={<GithubSearchPage />} />
      <Route path="script/:owner/:repo/install" element={<ScriptInstallPage />} />
      <Route path="script/:owner/:repo" element={<ScriptDetailPage />} />
    </Routes>
  );
}