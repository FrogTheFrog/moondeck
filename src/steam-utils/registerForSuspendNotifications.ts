import { SuspendProgress } from "@decky/ui/dist/globals/steam-client/User";
import { logger } from "../lib/logger";

/**
 * Invokes appropriate callback when user suspends or unsuspends the deck.
 */
export function registerForSuspendNotifictions(onSuspend: (info: SuspendProgress) => Promise<void>, onResume: (info: SuspendProgress) => Promise<void>): () => void {
  try {
    const unregisterOnSuspend = SteamClient.User.RegisterForPrepareForSystemSuspendProgress((info) => { onSuspend(info).catch((err) => logger.critical(err)); });
    const unregisterOnResume = SteamClient.User.RegisterForResumeSuspendedGamesProgress((info) => { onResume(info).catch((err) => logger.critical(err)); });
    return () => {
      unregisterOnSuspend.unregister();
      unregisterOnResume.unregister();
    };
  } catch (error) {
    logger.critical(error);
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return () => { };
  }
}
