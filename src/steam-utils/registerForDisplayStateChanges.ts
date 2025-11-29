import { logger } from "../lib/logger";

/**
 * Invokes callback when the display state changes.
 */
export function registerForDisplayStateChanges(onChange: () => void): () => void {
  try {
    const unregisterable = SteamClient.System.DisplayManager.RegisterForStateChanges(onChange);
    return () => unregisterable.unregister();
  } catch (error) {
    logger.critical(error);
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return () => { };
  }
}
