import { logger } from "../lib/logger";

/**
 * Invokes appropriate callback when user suspends or unsuspends the deck.
 */
export function registerForSuspendNotifictions(onSuspend: () => Promise<void>, onResume: () => Promise<void>): () => void {
  try {
    let suspended: boolean | null = null;
    const handleSuspend = async () => {
      const new_state = true;
      if (suspended !== new_state) {
        suspended = new_state;
        await onSuspend();
      }
    };
    const handleResume = async () => {
      const new_state = false;
      if (suspended !== new_state) {
        suspended = new_state;
        await onResume();
      }
    };

    const unregisterOnSuspend = SteamClient.User.RegisterForPrepareForSystemSuspendProgress(() => { handleSuspend().catch((err) => logger.critical(err)); });
    const unregisterOnResume = SteamClient.User.RegisterForResumeSuspendedGamesProgress(() => { handleResume().catch((err) => logger.critical(err)); });
    return () => {
      unregisterOnSuspend.unregister();
      unregisterOnResume.unregister();
    };
  } catch (error) {
    logger.critical(error);
    return () => { };
  }
}
