import { api, type SpiritPanelReleaseInfo } from './api';

let releaseCache: SpiritPanelReleaseInfo | null = null;
let releasePromise: Promise<SpiritPanelReleaseInfo> | null = null;

/** Cached lookup of installed vs latest Spirit Panel release (admin API). */
export function loadSpiritPanelRelease(force = false): Promise<SpiritPanelReleaseInfo> {
  if (force) {
    releaseCache = null;
    releasePromise = null;
  }
  if (!force && releaseCache) return Promise.resolve(releaseCache);
  if (releasePromise) return releasePromise;
  releasePromise = api.admin
    .spiritPanelRelease()
    .then((data) => {
      releaseCache = data;
      return data;
    })
    .finally(() => {
      releasePromise = null;
    });
  return releasePromise;
}
