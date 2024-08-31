import { SteamClientEx, SystemResumeInfo, SystemSuspendInfo } from "./shared";
import { logger } from "../lib/logger";

/**
 * Invokes appropriate callback when user suspends or unsuspends the deck.
 */
export function registerForSuspendNotifictions(onSuspend: (info: SystemSuspendInfo) => Promise<void>, onResume: (info: SystemResumeInfo) => Promise<void>): () => void {
  try {
    const unregisterOnSuspend = (SteamClient as SteamClientEx).User.RegisterForPrepareForSystemSuspendProgress((info) => { onSuspend(info).catch((err) => logger.critical(err)); }).unregister;
    const unregisterOnResume = (SteamClient as SteamClientEx).User.RegisterForResumeSuspendedGamesProgress((info) => { onResume(info).catch((err) => logger.critical(err)); }).unregister;
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
