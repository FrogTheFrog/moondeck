import { AppDetails, LifetimeNotification, SteamShortcut } from "decky-frontend-lib";

export interface SystemSuspendInfo {
  state: number;
}

export interface SystemResumeInfo {
  state: number;
  bGameSuspended: boolean;
}

export interface SteamClientEx {
  Apps: {
    AddShortcut: (appName: string, execPath: string) => Promise<number | undefined | null>;
    GetAllShortcuts: () => Promise<SteamShortcut[]>;
    RegisterForAppDetails: (appId: number, callback: (details: AppDetails) => void) => { unregister: () => void };
    RemoveShortcut: (appId: number) => void;
    RunGame: (gameId: string, _1: string, _2: number, _3: number) => void;
    SetAppLaunchOptions: (appId: number, options: string) => void;
    SetShortcutName: (appId: number, name: string) => void;
    TerminateApp: (gameId: string, _1: boolean) => void;
  };
  GameSessions: {
    RegisterForAppLifetimeNotifications: (callback: (data: LifetimeNotification) => void) => { unregister: () => void };
  };
  User: {
    RegisterForLoginStateChange: (callback: (username: string) => void) => { unregister: () => void };
    RegisterForPrepareForSystemSuspendProgress: (callback: (info: SystemSuspendInfo) => void) => { unregister: () => void };
    RegisterForResumeSuspendedGamesProgress: (callback: (info: SystemResumeInfo) => void) => { unregister: () => void };
    StartRestart: () => void;
  };
}

/**
 * Tries to retrieve the app details from Steam.
 *
 * @param appId id to get details for.
 * @returns AppDetails if succeeded or null otherwise.
 */
export async function getAppDetails(appId: number): Promise<AppDetails | null> {
  return await new Promise((resolve) => {
    let timeoutId: NodeJS.Timeout | undefined;
    try {
      const { unregister } = (SteamClient as SteamClientEx).Apps.RegisterForAppDetails(appId, (details) => {
        clearTimeout(timeoutId);
        unregister();
        resolve(details);
      });

      timeoutId = setTimeout(() => {
        unregister();
        resolve(null);
      }, 1000);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(error);
      resolve(null);
    }
  });
}
