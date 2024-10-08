import { SteamClientEx } from "./shared";
import { getGameId } from "./getGameId";
import { logger } from "../lib/logger";
import { waitForAppLifetimeNotification } from "./waitForAppLifetimeNotification";

/**
 * Tries to launch the app.
 *
 * @param appId app id to launch.
 * @param timeout time to wait for the 'app start' notification.
 * @returns True if the app was launched and notification received, false otherwise.
 */
export async function launchApp(appId: number, timeout: number): Promise<boolean> {
  logger.log(`Trying to launch app ${appId}.`);
  const gameId = await getGameId(appId);

  if (gameId === null) {
    return false;
  }

  try {
    const startNotification = waitForAppLifetimeNotification(appId, "start", timeout);
    (SteamClient as SteamClientEx).Apps.RunGame(gameId, "", -1, 100);
    return await startNotification;
  } catch (error) {
    logger.critical(error);
    return false;
  }
}
