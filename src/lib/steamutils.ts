import { AppDetails, LifetimeNotification, SteamShortcut } from "decky-frontend-lib";
import { SteamClientEx, getAppDetails } from "../steam-utils";
export * from "../steam-utils";

export function registerForGameLifetime(callback: (data: LifetimeNotification) => void): () => void {
  const { unregister } = (SteamClient as SteamClientEx).GameSessions.RegisterForAppLifetimeNotifications(callback);
  return unregister;
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

export async function getAllMoonDeckShortcuts(): Promise<SteamShortcut[]> {
  const moonDeckShortcuts: SteamShortcut[] = [];

  const shortcuts = await (SteamClient as SteamClientEx).Apps.GetAllShortcuts();
  for (const shortcut of shortcuts) {
    if (shortcut.data.strExePath.includes("moondeckrun.sh")) {
      moonDeckShortcuts.push(shortcut);
    }
  }

  return moonDeckShortcuts;
}

export async function getAllMoonDeckAppDetails(): Promise<AppDetails[]> {
  const moonDeckApps: AppDetails[] = [];

  const shortcuts = await getAllMoonDeckShortcuts();
  for (const shortcut of shortcuts) {
    const details = await getAppDetails(shortcut.appid);
    if (details != null) {
      moonDeckApps.push(details);
    }
  }

  return moonDeckApps;
}

export function isAppTypeSupported(appType: number): boolean {
  // Only steam games are supported.
  return appType === 1;
}
