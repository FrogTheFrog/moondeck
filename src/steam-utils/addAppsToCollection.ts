import { AppStoreOverview, getAppStoreEx } from "./getAppStoreEx";
import { getOrCreateCollection } from "./getOrCreateCollection";
import { logger } from "../lib/logger";

/**
 * Add apps to the collection.
 */
export async function addAppsToCollection(tag: string, appIds: number[]): Promise<boolean> {
  if (appIds.length === 0) {
    return true;
  }

  const collection = await getOrCreateCollection(tag);
  if (collection === null) {
    logger.error(`Could not add apps to collection for ${tag} - null collection!`);
    return false;
  }

  const missingAppIds = new Set(appIds.filter((appId) => !collection.apps.has(appId)));
  if (missingAppIds.size === 0) {
    logger.debug(`All the apps for collection ${tag} are already in the store.`);
    return true;
  }

  const appStoreEx = getAppStoreEx();
  if (appStoreEx === null) {
    logger.error(`Could not add apps to collection for ${tag} - appStoreEx is null!`);
    return false;
  }

  const failedToAdd: number[] = [];
  const overviews: AppStoreOverview[] = [];
  for (const appId of missingAppIds) {
    const overview = appStoreEx.getAppOverview(appId);
    if (overview) {
      overviews.push(overview);
    } else {
      failedToAdd.push(appId);
    }
  }

  collection.AsDragDropCollection().AddApps(overviews);
  await collection.Save();
  if (failedToAdd.length > 0) {
    logger.error(`Could not add all apps to collection for ${tag} - missing overview for:`, failedToAdd);
    return false;
  }

  return true;
}
