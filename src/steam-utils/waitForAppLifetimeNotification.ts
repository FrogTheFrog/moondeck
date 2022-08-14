import { LifetimeNotification } from "decky-frontend-lib";
import { SteamClientEx } from "./getAppDetails";

export type AnyId = null;
export type NotificationType = "start" | "end";

/**
 * Convenience function for waiting until the lifetime notification is received.
 */
export async function waitForAppLifetimeNotification(appId: number | AnyId, type: NotificationType, timeout: number): Promise<boolean> {
  // MUST leave this function async/await (for usage purposes)!
  return await new Promise<boolean>((resolve) => {
    let timeoutId: NodeJS.Timeout | undefined;
    const waitingForRunning = type === "start";

    try {
      const { unregister } = (SteamClient as SteamClientEx).GameSessions.RegisterForAppLifetimeNotifications((data: LifetimeNotification) => {
        if (appId !== null && data.unAppID !== appId) {
          return;
        }

        if (waitingForRunning !== data.bRunning) {
          return;
        }

        clearTimeout(timeoutId);
        unregister();
        resolve(true);
      });

      timeoutId = setTimeout(() => {
        unregister();
        resolve(false);
      }, timeout);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(error);
      resolve(false);
    }
  });
}
