import { SteamClientEx } from "./shared";
import { getAppStoreEx } from "./getAppStoreEx";
import { getCollectionStore } from "./getCollectionStore";
import { logger } from "../lib/logger";
import { waitForAppOverview } from "./waitForAppOverview";

/**
 * Remove the shortcus for the app id.
 *
 * @remarks
 * It seems that something is missing in this function.
 *
 * We are doing the same thing as Valve, but for some reason
 * after removing a certain amount of shortcuts (or just at random),
 * the Steam client gets into a corrupted state. It create incomplete
 * shortcuts, start failing to change shortcut properties, like launch
 * options and etc.
 *
 * The solution is to restart the Steam client and then it works again...
 *
 * @param appId app id to remove the shortcut for.
 * @returns True if shortcut was removed, false otherwise.
 */
export async function removeShortcut(appId: number): Promise<boolean> {
  const appStoreEx = getAppStoreEx();
  if (appStoreEx === null) {
    logger.error(`Could not remove shortcut for ${appId} - appStoreEx is null!`);
    return false;
  }

  const overview = await waitForAppOverview(appId, (overview) => overview !== null) ? appStoreEx.getAppOverview(appId) : null;
  if (overview === null) {
    logger.error(`Could not remove shortcut for ${appId} - does not exist!`);
    return true;
  }

  const collectionStore = getCollectionStore();
  if (collectionStore === null) {
    logger.error(`Could not remove shortcut for ${appId} - null collectionStore!`);
    return false;
  }

  try {
    logger.log(`Removing shortcut for ${appId}.`);
    (SteamClient as SteamClientEx).Apps.RemoveShortcut(appId);

    for (const collection of collectionStore.userCollections) {
      if (collection.bAllowsDragAndDrop && collection.apps.has(appId)) {
        logger.log("Removing ", appId, " from ", collection);
        collection.AsDragDropCollection().RemoveApps([overview]);
      }
    }

    if (!await waitForAppOverview(appId, (overview) => overview === null)) {
      logger.error(`Could not remove shortcut for ${appId}!`);
      return false;
    }

    return true;
  } catch (error) {
    logger.critical(error);
    return false;
  }
}
