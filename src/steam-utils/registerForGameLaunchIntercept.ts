import { SteamClientEx } from "./shared";
import { logger } from "../lib/logger";

/**
 * Intercepts the app launch action and lets you cancel the launch.
 */
export function registerForGameLaunchIntercept(callback: (gameId: string, cancel: () => void) => void): () => void {
  try {
    return (SteamClient as SteamClientEx).Apps.RegisterForGameActionStart((gameActionId, gameId, action, _1) => {
      if (action === "LaunchApp") {
        callback(gameId, () => (SteamClient as SteamClientEx).Apps.CancelGameAction(gameActionId));
      }
    }).unregister;
  } catch (error) {
    logger.critical(error);
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return () => { };
  }
}
