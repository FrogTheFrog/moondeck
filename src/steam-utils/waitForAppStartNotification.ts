import { AppLifetimeNotification } from "@decky/ui/dist/globals/steam-client/GameSessions";
import { SteamClientEx } from "./shared";
import { logger } from "../lib/logger";

export enum AppStartResult {
  TimeoutOrError,
  Started,
  Cancelled
}

// eslint-disable-next-line @typescript-eslint/promise-function-async
function waitForLifetimeNotification(appId: number, lifetimeCallback: (running: boolean) => void): () => void {
  try {
    const { unregister } = (SteamClient as SteamClientEx).GameSessions.RegisterForAppLifetimeNotifications((data: AppLifetimeNotification) => {
      if (data.unAppID !== appId) {
        return;
      }

      lifetimeCallback(data.bRunning);
    });

    let unregistered = false;
    return () => {
      if (!unregistered) {
        unregistered = true;
        unregister();
      }
    };
  } catch (error) {
    logger.critical(error);
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return () => { };
  }
}

// For handling the case where the user cancels the app launch.
function waitForProcessLaunchAction(gameId: string, processLaunched: (launched: boolean) => void): () => void {
  try {
    let actionId: number | null = null;
    let callbackInvoked = false;
    const { unregister: unregisterStart } = (SteamClient as SteamClientEx).Apps.RegisterForGameActionStart((gameActionId, gameIdFromAction, action, _1) => {
      if (action === "LaunchApp" && gameIdFromAction === gameId && actionId === null) {
        actionId = gameActionId;
      }
    });
    const { unregister: unregisterTaskChange } = (SteamClient as SteamClientEx).Apps.RegisterForGameActionTaskChange((gameActionId, _1, _2, task, _3) => {
      if (gameActionId === actionId && task === "CreatingProcess" && !callbackInvoked) {
        callbackInvoked = true;
        processLaunched(true);
      }
    });
    const { unregister: unregisterEnd } = (SteamClient as SteamClientEx).Apps.RegisterForGameActionEnd((gameActionId) => {
      if (gameActionId === actionId && !callbackInvoked) {
        callbackInvoked = true;
        processLaunched(false);
      }
    });

    let unregistered = false;
    return () => {
      if (!unregistered) {
        unregistered = true;
        unregisterStart();
        unregisterTaskChange();
        unregisterEnd();
      }
    };
  } catch (error) {
    logger.critical(error);
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return () => { };
  }
}

/**
 * Convenience function for waiting until app starts.
 */
export async function waitForAppStartNotification(appId: number, gameId: string, timeout: number): Promise<AppStartResult> {
  // MUST leave this function async/await (for usage purposes)!
  return await new Promise<AppStartResult>((_resolve) => {
    let alreadyResolved = false;
    let timeoutId: NodeJS.Timeout | undefined;
    let unregisterAction: (() => void) | undefined;
    let unregisterNotification: (() => void) | undefined;
    const resolve = (value: AppStartResult): void => {
      if (!alreadyResolved) {
        alreadyResolved = true;
        clearTimeout(timeoutId);
        unregisterAction?.();
        unregisterNotification?.();
        _resolve(value);
      }
    };

    try {
      unregisterAction = waitForProcessLaunchAction(gameId, (launched) => {
        if (launched) {
          unregisterAction?.();
        } else {
          resolve(AppStartResult.Cancelled);
        }
      });
      unregisterNotification = waitForLifetimeNotification(appId, (running) => {
        resolve(running ? AppStartResult.Started : AppStartResult.TimeoutOrError);
      });
      timeoutId = setTimeout(() => { resolve(AppStartResult.TimeoutOrError); }, timeout);
    } catch (error) {
      logger.critical(error);
      resolve(AppStartResult.TimeoutOrError);
    }
  });
}
