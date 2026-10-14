import { AppStoreOverview } from "./getAppStoreEx";
import { getCollectionStore } from "./getCollectionStore";
import { logger } from "../lib/logger";

/**
 * @returns all the ids for the Non-Steam apps.
 */
export function getAllNonSteamAppIds(): number[] | null {
  try {
    const collectionStore = getCollectionStore();
    if (collectionStore === null) {
      logger.error("Could not get all Non-Steam app ids - null collectionStore!");
      return null;
    }

    // This is a magic number used by deckDesktopApps
    const gameAppType = 1;

    // deckDesktopApps sometimes returns null when UI is not visible (optimization maybe?), which is not good for us and we need to get all shortcuts ourselves.
    const allApps: AppStoreOverview[] | null = collectionStore.GetCollectionForAppType(gameAppType)?.allApps
      .filter((entry) => entry.BIsShortcut()) ?? null;
    if (allApps === null) {
      logger.error("Could not get all Non-Steam app ids - null game collection!");
      return null;
    }

    return allApps
      .filter((app) => app.is_available_on_current_platform)
      .map((app) => app.appid);
  } catch (error) {
    logger.critical(error);
    return null;
  }
}
