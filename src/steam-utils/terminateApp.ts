import { SteamClientEx } from "./getAppDetails";
import { getGameId } from "./getGameId";
import { waitForAppLifetimeNotification } from "./waitForAppLifetimeNotification";

/**
 * Tries to terminate the app.
 *
 * @param appId app id to terminate.
 * @param timeout time to wait for the 'app end' notification.
 * @returns True if the app was terminated and notification received, false otherwise.
 */
export async function terminateApp(appId: number, timeout: number): Promise<boolean> {
  console.log(`Trying to terminate app ${appId}.`);
  const gameId = await getGameId(appId);

  if (gameId === null) {
    return false;
  }

  try {
    // Currently Steam fails to properly set appid for non-Steam games, so we use null :/
    const startNotification = waitForAppLifetimeNotification(null, "end", timeout);
    (SteamClient as SteamClientEx).Apps.TerminateApp(gameId, false);
    return await startNotification;
  } catch (error) {
    console.error(error);
    return false;
  }
}
