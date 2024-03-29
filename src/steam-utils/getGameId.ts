import { getAppStoreEx } from "./getAppStoreEx";
import { logger } from "../lib/logger";
import { waitForAppOverview } from "./waitForAppOverview";

/**
 * Tries to retrieve the game id for the app id.
 *
 * @note
 * It seems that for Steam apps, app id is equal to the game id.
 *
 * @param appId app id to get the game id for.
 * @returns GameId if succeeded or null otherwise.
 */
export async function getGameId(appId: number): Promise<string | null> {
  const appStoreEx = getAppStoreEx();
  if (appStoreEx === null) {
    logger.error(`Could not get game id for ${appId} - appStoreEx is null!`);
    return null;
  }

  const overview = await waitForAppOverview(appId, (overview) => overview !== null) ? appStoreEx.getAppOverview(appId) : null;
  if (overview === null) {
    logger.error(`Could not get game id for ${appId}!`);
    return null;
  }

  return overview.gameid ?? null;
}
