import { findModuleExport } from "@decky/ui";
import { getSuspendResumeStore } from "./getSuspendResumeStore";
import { logger } from "../lib/logger";

interface UnregisterObj {
  unregister: () => void;
}
type NofityCallback = (...args: unknown[]) => void;

interface SleepManager {
  RegisterForNotifyResumeFromSuspend: (callback: NofityCallback) => UnregisterObj;
  RegisterForNotifyRequestSuspend: (callback: NofityCallback) => UnregisterObj;
};
const NullCallback = () => { };

/**
 * Invokes appropriate callback when user suspends or unsuspends the deck.
 */
export function registerForSuspendNotifications(onSuspend: () => Promise<void>, onResume: () => Promise<void>): () => void {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
  const sleepManager: SleepManager | undefined = findModuleExport((mod: any) => mod?.RegisterForNotifyResumeFromSuspend && mod?.RegisterForNotifyRequestSuspend);
  if (!sleepManager) {
    logger.toast("Failed to find SleepManager!", { output: "error" });
    return NullCallback;
  }

  const suspendResumeStore = getSuspendResumeStore();
  if (!suspendResumeStore) {
    logger.toast("Failed to get SuspendResumeStore!", { output: "error" });
    return NullCallback;
  }

  try {
    let unblockSuspend: typeof NullCallback | null = null;
    let handlingSuspend = false;

    const handleSuspend = () => {
      if (unblockSuspend && !handlingSuspend) {
        handlingSuspend = true;
        onSuspend()
          .catch((err) => logger.critical(err))
          .finally(() => {
            handlingSuspend = false;
            unblockSuspend?.();
            unblockSuspend = null;
            suspendResumeStore.RequestSleep();
          });
      }
    };
    const handleResume = () => {
      if (!unblockSuspend) {
        unblockSuspend = suspendResumeStore.BlockSuspendAction();
        onResume().catch((err) => logger.critical(err));
      }
    };

    const unregisterOnSuspend = sleepManager.RegisterForNotifyRequestSuspend((..._args) => handleSuspend());
    const unregisterOnResume = sleepManager.RegisterForNotifyResumeFromSuspend((..._args) => handleResume());

    unblockSuspend = suspendResumeStore.BlockSuspendAction();
    return () => {
      unregisterOnSuspend.unregister();
      unregisterOnResume.unregister();
      unblockSuspend?.();
    };
  } catch (error) {
    logger.critical(error);
    return NullCallback;
  }
}
