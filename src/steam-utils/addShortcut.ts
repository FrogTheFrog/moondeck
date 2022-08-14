import { SteamClientEx } from "./getAppDetails";
import { getAppOverview } from "./getAppOverview";
import { removeShortcut } from "./removeShortcut";
import { waitForAppOverview } from "./waitForAppOverview";

/**
 * Tries to add a non-Steam shortcut.
 *
 * @remarks
 * If this function starts failing, the Steam client got into a corrupted state and needs
 * to be restarted.
 *
 * @param appName App name for the shortcut.
 * @param execPath Executable path for the shortcut.
 * @returns AppId if succeeded or null otherwise.
 */
export async function addShortcut(appName: string, execPath: string): Promise<number | null> {
  console.log(`Adding shortcut for ${appName}.`);

  const appId = await (SteamClient as SteamClientEx).Apps.AddShortcut(appName, execPath);
  if (typeof appId === "number") {
    if (await waitForAppOverview(appId, (overview) => overview !== null)) {
      const overview = await getAppOverview(appId);

      // Comparison to display name is necessary as sometimes Steam decides
      // to generate an incomplete shortcut (see comments for 'removeShortcut')
      if (overview !== null && overview.display_name === appName) {
        return appId;
      }
    }

    // necessary cleanup to avoid duplicates, which is very BAD (Steam goes bonkers)
    await removeShortcut(appId);
  }

  console.log(`Could not add shortcut for ${appName}!`);
  return null;
}
