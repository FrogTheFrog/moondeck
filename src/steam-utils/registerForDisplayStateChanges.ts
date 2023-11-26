import { SteamClientEx } from "./shared";
import { logger } from "../lib/logger";

/**
 * Invokes callback when the display state changes.
 */
export function registerForDisplayStateChanges(onChange: () => void): () => void {
  try {
    return (SteamClient as SteamClientEx).System.DisplayManager.RegisterForStateChanges(onChange).unregister;
  } catch (error) {
    logger.critical(error);
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return () => { };
  }
}
