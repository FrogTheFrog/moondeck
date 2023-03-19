import { AppResolutionOverrideConstants, SteamClientEx } from "./shared";
import { logger } from "../lib";

/**
 * @returns The current resolution override for the app.
 */
export async function getAppResolutionOverride(appId: number): Promise<AppResolutionOverrideConstants | string | null> {
  try {
    return await (SteamClient as SteamClientEx).Apps.GetResolutionOverrideForApp(appId);
  } catch (error) {
    logger.critical(error);
    return null;
  }
}
