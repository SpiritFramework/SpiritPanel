export interface MarketplaceScriptPreview {
  owner: string;
  repo: string;
  name: string;
  ownerAvatarUrl?: string | null;
  description?: string;
  stars?: number;
  forks?: number;
  language?: string | null;
  topics?: string[];
  blurb?: string;
  category?: string;
}

export type MarketplaceScriptLocationState = {
  preview?: MarketplaceScriptPreview;
};
