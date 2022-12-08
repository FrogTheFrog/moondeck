import { SteamAppOverview } from "./getAppStore";
import { getAppOverview } from "./getAppOverview";
import { waitForPredicate } from "./shared";

export type OverviewPredicate = (overview: SteamAppOverview | null) => (boolean | Promise<boolean>);

/**
 * Convenience function for waiting until app overview are in desired state.
 */
export async function waitForAppOverview(appId: number, predicate: OverviewPredicate): Promise<boolean> {
  return await waitForPredicate(3, 250, async () => {
    const overview = await getAppOverview(appId);
    return await predicate(overview);
  });
}
