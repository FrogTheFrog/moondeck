import { AppDetails, LifetimeNotification } from "@decky/ui";
import { SteamClientEx, getAllNonSteamAppIds, getAppDetails, getCurrentDisplayMode } from "../steam-utils";
import { logger } from "./logger";
import { throttleAll } from "promise-throttle-all";
export * from "../steam-utils";

export function registerForGameLifetime(callback: (data: LifetimeNotification) => void): () => void {
  const { unregister } = (SteamClient as SteamClientEx).GameSessions.RegisterForAppLifetimeNotifications(callback);
  return unregister;
}

export async function getCurrentDisplayModeString(): Promise<string | null> {
  const currentMode = await getCurrentDisplayMode();
  return currentMode ? `${currentMode.width}x${currentMode.height}` : null;
}

export function getMoonDeckManagedMark(): string {
  return "MOONDECK_MANAGED=1";
}

export function getMoonDeckResMark(mode: string | null, useAutoResolution: boolean): string {
  const mark = "MOONDECK_AUTO_RES";
  if (mode === null || !useAutoResolution) {
    return "";
  }

  return ` ${mark}="${mode}"`;
}

export function getMoonDeckLinkedDisplayMark(display: string | null): string {
  const mark = "MOONDECK_LINKED_DISPLAY";
  if (display === null) {
    return "";
  }

  return ` ${mark}="${display}"`;
}

export function getMoonDeckAppIdMark(appId: number | null): string {
  const mark = "MOONDECK_STEAM_APP_ID";
  if (appId === null) {
    return mark;
  }

  return `${mark}=${appId}`;
}

export function getMoonDeckPythonMark(path: string): string {
  const mark = "MOONDECK_PYTHON";
  if (path.trim().length === 0) {
    return "";
  }

  return ` ${mark}="${path}"`;
}

export function getAppIdFromShortcut(value: string): number | null {
  const regex = new RegExp(`(?:${getMoonDeckAppIdMark(null)}=(?<steamAppId>\\d+))`, "gi");
  const matches = value.matchAll(regex);

  let steamAppId: number | null = null;
  for (const match of matches) {
    if (match.groups != null) {
      if (match.groups.steamAppId.length > 0) {
        if (steamAppId !== null) {
          return null;
        }

        steamAppId = Number(match.groups.steamAppId);
      }
    }
  }

  return steamAppId;
}

export async function getAllMoonDeckAppDetails(): Promise<AppDetails[]> {
  try {
    const moonDeckApps: AppDetails[] = [];

    const appids = getAllNonSteamAppIds();
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    const tasks = appids.map((appid) => () => getAppDetails(appid));
    const allDetails = await throttleAll(100, tasks);

    for (const details of allDetails) {
      if (details?.strShortcutExe.includes("moondeckrun.sh")) {
        moonDeckApps.push(details);
      }
    }

    return moonDeckApps;
  } catch (error) {
    logger.critical(error);
    return [];
  }
}

export async function getAllExternalAppDetails(): Promise<AppDetails[]> {
  try {
    const externalApps: AppDetails[] = [];

    const appids = getAllNonSteamAppIds();
    // eslint-disable-next-line @typescript-eslint/promise-function-async
    const tasks = appids.map((appid) => () => getAppDetails(appid));
    const allDetails = await throttleAll(100, tasks);

    for (const details of allDetails) {
      if (details?.strShortcutLaunchOptions.includes(getMoonDeckManagedMark())) {
        externalApps.push(details);
      }
    }

    return externalApps;
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
