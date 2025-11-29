import { AppDetails } from "@decky/ui/dist/globals/steam-client/App";
import { Unregisterable } from "@decky/ui";
import { logger } from "../lib/logger";

export type DetailsPredicate = (details: AppDetails | null) => (boolean | Promise<boolean>);
export interface WaitResult {
  details: AppDetails | null;
  matchesPredicate: boolean;
}

/**
 * Convenience function for waiting until app details are in desired state.
 */
export async function waitForAppDetails(appId: number, predicate: DetailsPredicate): Promise<WaitResult> {
  return await new Promise((_resolve) => {
    let alreadyResolved = false;
    let timeoutId: NodeJS.Timeout | undefined;
    let unregisterable: Unregisterable | undefined;

    let lastDetails: AppDetails | null = null;
    const resolve = (match: boolean): void => {
      if (!alreadyResolved) {
        alreadyResolved = true;
        clearTimeout(timeoutId);
        unregisterable?.unregister();
        _resolve({ details: lastDetails, matchesPredicate: match });
      }
    };

    try {
      unregisterable = SteamClient.Apps.RegisterForAppDetails(appId, (details) => {
        lastDetails = Object.keys(details).length > 0 ? details : null;
        if (predicate(lastDetails)) {
          resolve(true);
        }
      });

      timeoutId = setTimeout(() => resolve(false), 1000);
    } catch (error) {
      logger.critical(error);
      resolve(false);
    }
  });
}
