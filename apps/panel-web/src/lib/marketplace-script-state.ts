import type { GithubSearchResult } from './api';

export interface MarketplaceScriptPreview {
  owner: string;
  repo: string;
  name: string;
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

export function previewFromSearchResult(
  item: GithubSearchResult,
  extras?: { blurb?: string; category?: string },
): MarketplaceScriptPreview {
  return {
    owner: item.owner,
    repo: item.repo,
    name: item.name,
    description: extras?.blurb || item.description,
    stars: item.stars,
    forks: item.forks,
    language: item.language,
    topics: item.topics,
    blurb: extras?.blurb,
    category: extras?.category,
  };
}
