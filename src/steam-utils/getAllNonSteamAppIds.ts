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

    return Array.from(collectionStore.deckDesktopApps.allApps)
      .filter((app) => app.is_available_on_current_platform)
      .map((app) => app.appid);
  } catch (error) {
    logger.critical(error);
    return [];
  }
}
