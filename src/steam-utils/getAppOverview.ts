import { SteamAppOverview, getAppStore } from "./getAppStore";
import { logger } from "../lib/logger";

/**
 * Tries to retrieve the app overview from the app store.
 *
 * @param appId id to get details for.
 * @returns SteamAppOverview if succeeded or null otherwise.
 */
export async function getAppOverview(appId: number): Promise<SteamAppOverview | null> {
  const appStore = getAppStore();
  if (appStore === null) {
    logger.error("Could not get app overview - null appStore!");
    return null;
  }

  try {
    return (await appStore.GetAppOverviewByAppID(appId)) ?? null;
  } catch (error) {
    logger.critical(error);
    return null;
  }
}
