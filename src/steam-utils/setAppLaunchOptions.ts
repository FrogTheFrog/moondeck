import { SteamClientEx } from "./shared";
import { getAppDetails } from "./getAppDetails";
import { logger } from "../lib/logger";
import { waitForAppDetails } from "./waitForAppDetails";

/**
 * Tries to change the launch options for the app.
 *
 * @param appId app id to change the launch options for.
 * @param value new value to be set.
 * @returns True if the launch options were changed (or already match), false otherwise.
 */
export async function setAppLaunchOptions(appId: number, value: string): Promise<boolean> {
  const details = await waitForAppDetails(appId, (details) => details !== null) ? await getAppDetails(appId) : null;
  if (details == null) {
    logger.log(`Could not set app launch options for ${appId} - does not exist!`);
    return false;
  }

  if (details.strLaunchOptions === value) {
    return true;
  }

  try {
    (SteamClient as SteamClientEx).Apps.SetAppLaunchOptions(appId, value);
    if (!await waitForAppDetails(appId, (details) => details !== null && details.strLaunchOptions === value)) {
      logger.error(`Could not set app launch options for ${appId}!`);
      return false;
    }
    return true;
  } catch (error) {
    logger.critical(error);
    return false;
  }
}
