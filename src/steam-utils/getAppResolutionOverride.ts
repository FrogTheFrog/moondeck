import { AppResolutionOverrideConstants } from "./shared";
import { logger } from "../lib/logger";

/**
 * @returns The current resolution override for the app.
 */
export async function getAppResolutionOverride(appId: number): Promise<AppResolutionOverrideConstants | string | null> {
  try {
    return await SteamClient.Apps.GetResolutionOverrideForApp(appId);
  } catch (error) {
    logger.critical(error);
    return null;
  }
}
