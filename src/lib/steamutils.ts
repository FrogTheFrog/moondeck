import { AppDetails, LifetimeNotification } from "decky-frontend-lib";
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
  // Only steam games are supported.
  return appType === 1;
}
