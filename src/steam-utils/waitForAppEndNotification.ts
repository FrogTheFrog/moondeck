import { Unregisterable } from "@decky/ui";
import { logger } from "../lib/logger";

/**
 * Convenience function for waiting until app ends.
 */
export async function waitForAppEndNotification(appId: number, timeout: number): Promise<boolean> {
  // MUST leave this function async/await (for usage purposes)!
  return await new Promise<boolean>((_resolve) => {
    let alreadyResolved = false;
    let timeoutId: NodeJS.Timeout | undefined;
    let unregisterable: Unregisterable | undefined;
    const resolve = (value: boolean): void => {
      if (!alreadyResolved) {
        alreadyResolved = true;
        clearTimeout(timeoutId);
        unregisterable?.unregister();
        _resolve(value);
      }
    };

    try {
      unregisterable = SteamClient.GameSessions.RegisterForAppLifetimeNotifications((data) => {
        if (appId !== null && data.unAppID !== appId) {
          return;
        }

        resolve(!data.bRunning);
      });
      timeoutId = setTimeout(() => { resolve(false); }, timeout);
    } catch (error) {
      logger.critical(error);
      resolve(false);
    }
  });
}
