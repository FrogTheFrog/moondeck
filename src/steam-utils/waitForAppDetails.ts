import { AppDetails, sleep } from "decky-frontend-lib";
import { getAppDetails } from "./getAppDetails";

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

export type DetailsPredicate = (details: AppDetails | null) => (boolean | Promise<boolean>);

/**
 * Convenience function for waiting until app details are in desired state.
 */
export async function waitForAppDetails(appId: number, predicate: DetailsPredicate): Promise<boolean> {
  return await waitForPredicate(3, 250, async () => {
    const details = await getAppDetails(appId);
    return await predicate(details);
  });
}
