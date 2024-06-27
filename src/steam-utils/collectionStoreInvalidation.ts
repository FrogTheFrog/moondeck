import { getCollectionStore } from "./getCollectionStore";
import { logger } from "../lib/logger";

/**
 * Workaround for https://github.com/ValveSoftware/steam-for-linux/issues/9943.
 */
export function collectionStoreInvalidation(): void {
  const collectionStore = getCollectionStore();
  if (collectionStore === null) {
    logger.error("Could not invalidate collection store - null collectionStore!");
    return;
  }

  // Seems to have been fixed in 2024-06-27 beta
  if (collectionStore.WarmCache) {
    collectionStore.WarmCache();
  }
}
