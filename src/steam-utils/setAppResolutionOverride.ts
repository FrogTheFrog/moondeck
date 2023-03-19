import { SteamClientEx } from "./shared";
import { getAppResolutionOverride } from "./getAppResolutionOverride";
import { logger } from "../lib";
import { waitForAppResolutionOverride } from "./waitForAppResolutionOverride";

/**
 * Sets the resolution override for the app.
 */
export async function setAppResolutionOverride(appId: number, value: string): Promise<boolean> {
  try {
    const currentValue = await getAppResolutionOverride(appId);
    if (currentValue == null) {
      logger.error(`Could not set app resolution override for ${appId} - failed to get current override!`);
      return false;
    }

    if (currentValue === value) {
      return true;
    }

    (SteamClient as SteamClientEx).Apps.SetAppResolutionOverride(appId, value);
    if (!await waitForAppResolutionOverride(appId, (override) => override === value)) {
      logger.error(`Failed to set resolution override for ${appId} - value did not change!`);
      return false;
    }

    return true;
  } catch (error) {
    logger.critical(error);
    return false;
  }
}
