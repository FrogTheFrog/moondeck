import { AppDetails, LifetimeNotification } from "@decky/ui";
import { SteamClientEx, getAllNonSteamAppIds, getAppDetails, getCurrentDisplayMode } from "../steam-utils";
import { call } from "@decky/api";
import { logger } from "./logger";
import { makeEnvKeyValue } from "./envutils";
import { throttleAll } from "promise-throttle-all";
export * from "../steam-utils";

export enum EnvVars {
  AppType = "MOONDECK_APP_TYPE",
  AutoResolution = "MOONDECK_AUTO_RES",
  LinkedDisplay = "MOONDECK_LINKED_DISPLAY",
  SteamAppId = "MOONDECK_STEAM_APP_ID",
  AppName = "MOONDECK_APP_NAME",
  Python = "MOONDECK_PYTHON"
}

export enum AppType {
  MoonDeck,
  GameStream
}

export function registerForGameLifetime(callback: (data: LifetimeNotification) => void): () => void {
  const { unregister } = (SteamClient as SteamClientEx).GameSessions.RegisterForAppLifetimeNotifications(callback);
  return unregister;
}

export async function getCurrentDisplayModeString(): Promise<string | null> {
  const currentMode = await getCurrentDisplayMode();
  return currentMode ? `${currentMode.width}x${currentMode.height}` : null;
}

let MoonDeckRunPath: string | null = null;
export async function getMoonDeckRunPath(): Promise<string | null> {
  if (MoonDeckRunPath !== null) {
    return MoonDeckRunPath;
  }

  try {
    MoonDeckRunPath = await call<[], string | null>("get_moondeckrun_path");
  } catch (message) {
    logger.critical("Error while getting moondeckrun.sh path: ", message);
  }
  return MoonDeckRunPath;
}

export function checkExecPathMatch(execPath: string, shortcutExe: string): boolean {
  return new RegExp(`^${execPath}|"${execPath}"$`).test(shortcutExe);
}

export async function getAllMoonDeckAppDetails(): Promise<AppDetails[]> {
  try {
    const moonDeckApps: AppDetails[] = [];

    const appids = getAllNonSteamAppIds();
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    const tasks = appids.map((appid) => () => getAppDetails(appid));
    const allDetails = await throttleAll(100, tasks);

    for (const details of allDetails) {
      if (details !== null) {
        const hasCorrectExec = details.strShortcutExe.includes("moondeckrun.sh");

        // First check is needed for backwards compat.
        const hasCorrectLaunchOptions = !details.strShortcutLaunchOptions.includes(EnvVars.AppType) ||
          details.strShortcutLaunchOptions.includes(makeEnvKeyValue(EnvVars.AppType, AppType.MoonDeck));

        if (hasCorrectExec && hasCorrectLaunchOptions) {
          moonDeckApps.push(details);
        }
      }
    }

    return moonDeckApps;
  } catch (error) {
    logger.critical(error);
    return [];
  }
}

export async function getAllGameStreamAppDetails(): Promise<AppDetails[]> {
  try {
    const gamestreamApps: AppDetails[] = [];

    const appids = getAllNonSteamAppIds();
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    const tasks = appids.map((appid) => () => getAppDetails(appid));
    const allDetails = await throttleAll(100, tasks);

    for (const details of allDetails) {
      if (details !== null) {
        // First check is needed for backwards compat.
        const hasCorrectLaunchOptions = details.strShortcutLaunchOptions.includes("MOONDECK_MANAGED=1") ||
          details.strShortcutLaunchOptions.includes(makeEnvKeyValue(EnvVars.AppType, AppType.GameStream));

        if (hasCorrectLaunchOptions) {
          gamestreamApps.push(details);
        }
      }
    }

    return gamestreamApps;
  } catch (error) {
    logger.critical(error);
    return [];
  }
}

export function isAppTypeSupported(appType: number): boolean {
  // Supported steam apps:
  switch (appType) {
    case 1: // game
      return true;
    case 2: // software
      return false;
    case 4: // tool
      return false;
    case 8: // demo
      return true;
    case 32: // dlc
      return false;
    case 128: // driver
      return false;
    case 256: // config
      return false;
    case 2048: // video
      return false;
    case 8192: // music
      return false;
    case 65536: // beta
      return true;
    default:
      return false;
  }
}
