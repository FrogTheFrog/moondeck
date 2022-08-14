import { SteamClientEx, getAppDetails } from "./getAppDetails";
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
    console.log(`Could not set app launch options for ${appId} - does not exist!`);
    return false;
  }

  if (details.strLaunchOptions === value) {
    return true;
  }

  try {
    (SteamClient as SteamClientEx).Apps.SetAppLaunchOptions(appId, value);
    if (!await waitForAppDetails(appId, (details) => details !== null && details.strLaunchOptions === value)) {
      console.error(`Could not set app launch options for ${appId}!`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}
