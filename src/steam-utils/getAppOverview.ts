import { SteamAppOverview, getAppStore } from "./getAppStore";

/**
 * Tries to retrieve the app overview from the app store.
 *
 * @param appId id to get details for.
 * @returns SteamAppOverview if succeeded or null otherwise.
 */
export async function getAppOverview(appId: number): Promise<SteamAppOverview | null> {
  const appStore = getAppStore();
  if (appStore === null) {
    console.log("Could not get app overview - null appStore!");
    return null;
  }

  try {
    return (await appStore.GetAppOverviewByAppID(appId)) ?? null;
  } catch (error) {
    console.error(error);
    return null;
  }
}
