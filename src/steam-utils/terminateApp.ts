import { SteamClientEx } from "./shared";
import { getGameId } from "./getGameId";
import { logger } from "../lib/logger";
import { waitForAppLifetimeNotification } from "./waitForAppLifetimeNotification";

/**
 * Tries to terminate the app.
 *
 * @param appId app id to terminate.
 * @param timeout time to wait for the 'app end' notification.
 * @returns True if the app was terminated and notification received, false otherwise.
 */
export async function terminateApp(appId: number, timeout: number): Promise<boolean> {
  logger.log(`Trying to terminate app ${appId}.`);
  const gameId = await getGameId(appId);

  if (gameId === null) {
    logger.error(`App's (${appId}) game id is null!`);
    return false;
  }

  try {
    const startNotification = waitForAppLifetimeNotification(appId, "end", timeout);
    (SteamClient as SteamClientEx).Apps.TerminateApp(gameId, false);
    return await startNotification;
  } catch (error) {
    logger.critical(error);
    return false;
  }
}
