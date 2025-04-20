import { AppDetails, LifetimeNotification, sleep } from "@decky/ui";

export interface SystemSuspendInfo {
  state: number;
}

export interface SystemResumeInfo {
  state: number;
  bGameSuspended: boolean;
}

export type AppResolutionOverrideConstants = "Default" | "Native";

export enum ControllerConfigOption {
  Disable = 0,
  Default = 1,
  Enable = 2
}
export type ControllerConfigValue = `${ControllerConfigOption}` extends `${infer T extends number}` ? T : never;

export interface SteamAudioDevice {
  id: number;
  sName: string;
  bHasOutput: boolean;
}

export interface SteamAudioData {
  activeOutputDeviceId: number;
  overrideOutputDeviceId: number;
  vecDevices: SteamAudioDevice[];
}

export interface SteamClientEx {
  Apps: {
    AddShortcut: (appName: string, execPath: string, args: string, cmdLine: string) => Promise<number | undefined | null>;
    CancelGameAction: (gameActionId: number) => void;
    GetResolutionOverrideForApp: (appId: number) => Promise<AppResolutionOverrideConstants | string>;
    RegisterForAppDetails: (appId: number, callback: (details: AppDetails) => void) => { unregister: () => void };
    RegisterForGameActionEnd: (callback: (gameActionIdentifier: number) => void) => { unregister: () => void };
    RegisterForGameActionStart: (callback: (gameActionIdentifier: number, gameId: string, action: string, source: unknown) => void) => { unregister: () => void };
    RegisterForGameActionTaskChange: (callback: (gameActionIdentifier: number, gameId: string, action: string, task: string, _1: unknown) => void) => { unregister: () => void };
    RemoveShortcut: (appId: number) => void;
    RunGame: (gameId: string, _1: string, _2: number, _3: number) => void;
    SetAppLaunchOptions: (appId: number, options: string) => void;
    SetAppResolutionOverride: (appId: number, resolution: AppResolutionOverrideConstants | string) => void;
    SetShortcutName: (appId: number, name: string) => void;
    SetThirdPartyControllerConfiguration: (appId: number, value: ControllerConfigValue) => void;
    TerminateApp: (gameId: string, _1: boolean) => void;
    ToggleOverrideResolutionForInternalDisplay: (appId: number) => void;
  };
  GameSessions: {
    RegisterForAppLifetimeNotifications: (callback: (data: LifetimeNotification) => void) => { unregister: () => void };
  };
  User: {
    RegisterForLoginStateChange: (callback: (username: string) => void) => { unregister: () => void };
    RegisterForPrepareForSystemSuspendProgress: (callback: (info: SystemSuspendInfo) => void) => { unregister: () => void };
    RegisterForResumeSuspendedGamesProgress: (callback: (info: SystemResumeInfo) => void) => { unregister: () => void };
    StartRestart: (param: boolean) => void;
  };
  System: {
    Audio: {
      GetDevices: () => Promise<SteamAudioData>;
    };
    DisplayManager: {
      RegisterForStateChanges: (callback: () => void) => { unregister: () => void };
    };
  };
}

export async function waitForPredicate(retries: number, delay: number, predicate: () => (boolean | Promise<boolean>)): Promise<boolean> {
  const waitImpl = async (): Promise<boolean> => {
    try {
      let tries = retries + 1;
      while (tries-- !== 0) {
        if (await predicate()) {
          return true;
        }

        if (tries > 0) {
          await sleep(delay);
        }
      }
    } catch (error) {
      console.error(error);
    }

    return false;
  };

  return await waitImpl();
}
