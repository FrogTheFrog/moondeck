import { collectionStoreInvalidation } from "./collectionStoreInvalidation";
import { getCollectionStore } from "./getCollectionStore";
import { logger } from "../lib/logger";

/**
 * @returns all the ids for the Non-Steam apps.
 */
export function getAllNonSteamAppIds(): number[] {
  try {
    const collectionStore = getCollectionStore();
    if (collectionStore === null) {
      logger.error("Could not get all Non-Steam app ids - null collectionStore!");
      return [];
    }

    collectionStoreInvalidation();
    return Array.from(collectionStore.deckDesktopApps.apps.keys());
  } catch (error) {
    logger.critical(error);
    return [];
  }
}
