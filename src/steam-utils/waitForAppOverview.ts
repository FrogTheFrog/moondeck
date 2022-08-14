import { SteamAppOverview } from "./getAppStore";
import { getAppOverview } from "./getAppOverview";
import { sleep } from "decky-frontend-lib";

async function waitForPredicate(retries: number, delay: number, predicate: () => (boolean | Promise<boolean>)): Promise<boolean> {
  const waitImpl = async (): Promise<boolean> => {
    try {
      let tries = retries + 1;
      while (tries-- !== 0) {
        if (await predicate()) {
          return true;
        }

        if (tries > 0) {
          await sleep(delay);
        }
      }
    } catch (error) {
      console.error(error);
    }

    return false;
  };

  return await waitImpl();
}

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
