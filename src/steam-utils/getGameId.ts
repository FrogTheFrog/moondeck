import { getAppOverview } from "./getAppOverview";
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
  const overview = await waitForAppOverview(appId, (overview) => overview !== null) ? await getAppOverview(appId) : null;
  if (overview === null) {
    console.log(`Could not get game id for ${appId}!`);
    return null;
  }

  return overview.gameid ?? null;
}
