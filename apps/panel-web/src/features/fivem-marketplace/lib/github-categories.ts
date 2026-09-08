import type { LucideIcon } from 'lucide-react';
import {
  Briefcase,
  Car,
  Home,
  LayoutGrid,
  Mic,
  Package,
  Radio,
  Sparkles,
  Wrench,
} from 'lucide-react';

export interface GithubBrowseCategory {
  id: string;
  label: string;
  query: string;
  description: string;
  icon: LucideIcon;
}

export const GITHUB_BROWSE_CATEGORIES: GithubBrowseCategory[] = [
  {
    id: 'libraries',
    label: 'Libraries',
    query: 'fivem library ox_lib',
    description: 'Shared utilities & dependencies',
    icon: Package,
  },
  {
    id: 'frameworks',
    label: 'Frameworks',
    query: 'fivem framework esx qbcore',
    description: 'ESX, QBCore & cores',
    icon: Sparkles,
  },
  {
    id: 'inventory',
    label: 'Inventory',
    query: 'fivem inventory ox',
    description: 'Slot-based & item systems',
    icon: Package,
  },
  {
    id: 'voice',
    label: 'Voice',
    query: 'fivem voice pma',
    description: 'Proximity voice & radio',
    icon: Mic,
  },
  {
    id: 'housing',
    label: 'Housing',
    query: 'fivem housing property',
    description: 'Properties & apartments',
    icon: Home,
  },
  {
    id: 'jobs',
    label: 'Jobs',
    query: 'fivem job police ems',
    description: 'Police, EMS & civilian jobs',
    icon: Briefcase,
  },
  {
    id: 'ui',
    label: 'UI / HUD',
    query: 'fivem hud ui nui',
    description: 'Menus, HUDs & interfaces',
    icon: LayoutGrid,
  },
  {
    id: 'garage',
    label: 'Garages',
    query: 'fivem garage vehicle',
    description: 'Garages & vehicle shops',
    icon: Car,
  },
  {
    id: 'dispatch',
    label: 'Dispatch',
    query: 'fivem dispatch mdt',
    description: 'MDT, dispatch & alerts',
    icon: Radio,
  },
  {
    id: 'standalone',
    label: 'Standalone',
    query: 'fivem standalone script',
    description: 'No framework required',
    icon: Wrench,
  },
];

export const GITHUB_FEATURED_PAGE_SIZE = 12;
export const GITHUB_SEARCH_PAGE_SIZE = 12;

export function githubCategoryById(id: string | undefined): GithubBrowseCategory | undefined {
  if (!id) return undefined;
  return GITHUB_BROWSE_CATEGORIES.find((c) => c.id === id);
}

export const GITHUB_CATEGORY_LABELS: Record<string, string> = {
  library: 'Library',
  libraries: 'Libraries',
  framework: 'Framework',
  frameworks: 'Frameworks',
  script: 'Script',
  voice: 'Voice',
  ui: 'UI / HUD',
  jobs: 'Jobs',
  housing: 'Housing',
  inventory: 'Inventory',
  map: 'Map',
  vehicle: 'Vehicle',
  other: 'Other',
};
