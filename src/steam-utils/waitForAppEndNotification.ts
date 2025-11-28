import { AppLifetimeNotification } from "@decky/ui/dist/globals/steam-client/GameSessions";
import { SteamClientEx } from "./shared";
import { logger } from "../lib/logger";

/**
 * Convenience function for waiting until app ends.
 */
export async function waitForAppEndNotification(appId: number, timeout: number): Promise<boolean> {
  // MUST leave this function async/await (for usage purposes)!
  return await new Promise<boolean>((_resolve) => {
    let alreadyResolved = false;
    let timeoutId: NodeJS.Timeout | undefined;
    let unregister: (() => void) | undefined;
    const resolve = (value: boolean): void => {
      if (!alreadyResolved) {
        alreadyResolved = true;
        clearTimeout(timeoutId);
        unregister?.();
        _resolve(value);
      }
    };

    try {
      unregister = (SteamClient as SteamClientEx).GameSessions.RegisterForAppLifetimeNotifications((data: AppLifetimeNotification) => {
        if (appId !== null && data.unAppID !== appId) {
          return;
        }

        resolve(!data.bRunning);
      }).unregister;
      timeoutId = setTimeout(() => { resolve(false); }, timeout);
    } catch (error) {
      logger.critical(error);
      resolve(false);
    }
  });
}
