import { logger } from "../lib/logger";

/**
 * Intercepts the app launch action and lets you cancel the launch.
 */
export function registerForGameLaunchIntercept(callback: (gameId: string, cancel: () => void) => void): () => void {
  try {
    const unregisterable = SteamClient.Apps.RegisterForGameActionStart((gameActionId, gameId, action, _1) => {
      if (action === "LaunchApp") {
        callback(gameId, () => SteamClient.Apps.CancelGameAction(gameActionId));
      }
    });
    return () => unregisterable.unregister();
  } catch (error) {
    logger.critical(error);
    return () => { };
  }
}
