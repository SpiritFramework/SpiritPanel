import { Route, Routes } from 'react-router-dom';
import { ServerMarketplacePage } from './ServerMarketplace';
import { MarketplaceScriptPage } from './MarketplaceScriptPage';
import { MarketplaceScriptInstallPage } from './MarketplaceScriptInstallPage';

/** Nested marketplace routes — avoids sibling path conflicts in React Router. */
export function MarketplaceRoutes() {
  return (
    <Routes>
      <Route index element={<ServerMarketplacePage />} />
      <Route path="script/:owner/:repo/install" element={<MarketplaceScriptInstallPage />} />
      <Route path="script/:owner/:repo" element={<MarketplaceScriptPage />} />
    </Routes>
  );
}
