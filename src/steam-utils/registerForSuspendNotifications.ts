import { SteamClientEx, SystemResumeInfo, SystemSuspendInfo } from "./shared";
import { logger } from "../lib/logger";

/**
 * Invokes appropriate callback when user suspends or unsuspends the deck.
 */
export function registerForSuspendNotifictions(onSuspend: (info: SystemSuspendInfo) => void, onResume: (info: SystemResumeInfo) => void): () => void {
  try {
    const unregisterOnSuspend = (SteamClient as SteamClientEx).User.RegisterForPrepareForSystemSuspendProgress(onSuspend).unregister;
    const unregisterOnResume = (SteamClient as SteamClientEx).User.RegisterForResumeSuspendedGamesProgress(onResume).unregister;
    return () => {
      unregisterOnSuspend();
      unregisterOnResume();
    };
  } catch (error) {
    logger.critical(error);
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return () => { };
  }
}
