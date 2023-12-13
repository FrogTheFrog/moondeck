import { AppStoreOverview, getAppStoreEx } from "./getAppStoreEx";
import { logger } from "../lib/logger";
import { waitForPredicate } from "./shared";

export type OverviewPredicate = (overview: AppStoreOverview | null) => (boolean | Promise<boolean>);

/**
 * Convenience function for waiting until app overview are in desired state.
 */
export async function waitForAppOverview(appId: number, predicate: OverviewPredicate): Promise<boolean> {
  const appStoreEx = getAppStoreEx();
  if (appStoreEx === null) {
    logger.error(`Could not wait for app overview for ${appId} - appStoreEx is null!`);
    return false;
  }

  return await waitForPredicate(3, 250, async () => {
    const overview = appStoreEx.getAppOverview(appId);
    return await predicate(overview);
  });
}
