import { SteamClientEx } from "./shared";
import { logger } from "../lib/logger";
import { waitForAppDetails } from "./waitForAppDetails";

/**
 * Set the resolution override for internal display to the desired value.
 */
export async function setOverrideResolutionForInternalDisplay(appId: number, value: boolean): Promise<boolean> {
  const { details } = await waitForAppDetails(appId, (details) => details !== null);
  if (details == null) {
    logger.log(`Could not set override resolution for internal display for ${appId} - does not exist!`);
    return false;
  }

  if (details.bOverrideInternalResolution === value) {
    return true;
  }

  try {
    (SteamClient as SteamClientEx).Apps.ToggleOverrideResolutionForInternalDisplay(appId);
    if (!(await waitForAppDetails(appId, (details) => details?.bOverrideInternalResolution === value)).matchesPredicate) {
      logger.error(`Could not set override resolution for internal display for ${appId}!`);
      return false;
    }
    return true;
  } catch (error) {
    logger.critical(error);
    return false;
  }
}
