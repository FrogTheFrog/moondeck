import { logger } from "../lib/logger";

/**
 * Restarts the Steam client.
 *
 * @note
 * This is explicitely exported here as it has a rather confusing name
 * in the global and it's nice to have the default way to restart
 * the Steam client.
 */
export function restartSteamClient(): void {
  try {
    SteamClient.User.StartRestart(true);
  } catch (error) {
    logger.critical(error);
  }
}
