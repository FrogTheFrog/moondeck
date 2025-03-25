import { AppStoreOverview, getAppStoreEx } from "./getAppStoreEx";
import { getOrCreateCollection } from "./getOrCreateCollection";
import { logger } from "../lib/logger";

/**
 * Remove apps from the collection.
 */
export async function removeAppsFromCollection(tag: string, appIds: number[], autoRemoveCollection = true): Promise<boolean> {
  const collection = await getOrCreateCollection(tag, true);
  if (collection === null) {
    return true;
  }

  const existingAppIds = new Set(appIds.filter((appId) => collection.apps.has(appId)));
  if (existingAppIds.size > 0) {
    const appStoreEx = getAppStoreEx();
    if (appStoreEx === null) {
      logger.error(`Could not remove apps from collection for ${tag} - appStoreEx is null!`);
      return false;
    }

    const failedToRemove: number[] = [];
    const overviews: AppStoreOverview[] = [];
    for (const appId of existingAppIds) {
      const overview = appStoreEx.getAppOverview(appId);
      if (overview) {
        overviews.push(overview);
      } else {
        failedToRemove.push(appId);
      }
    }

    collection.AsDragDropCollection().RemoveApps(overviews);
    await collection.Save();

    if (failedToRemove.length > 0) {
      logger.error(`Could not remove all apps from collection for ${tag} - missing overview for:`, failedToRemove);
      return false;
    }
  } else {
    logger.log(`There are no apps to be deleted from collection ${tag}.`);
  }

  if (autoRemoveCollection && Array.from(collection.apps.keys()).length === 0) {
    logger.log(`Deleting collection ${tag}.`);
    await collection.Delete();
  }

  return true;
}
