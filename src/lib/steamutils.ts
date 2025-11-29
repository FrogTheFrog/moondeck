import { getAllNonSteamAppIds, getAppDetails, getCurrentDisplayMode } from "../steam-utils";
import { AppDetails } from "@decky/ui/dist/globals/steam-client/App";
import { AppLifetimeNotification } from "@decky/ui/dist/globals/steam-client/GameSessions";
import { call } from "@decky/api";
import { logger } from "./logger";
import { throttleAll } from "promise-throttle-all";
export * from "../steam-utils";

export enum EnvVars {
  AppType = "MOONDECK_APP_TYPE",
  AutoResolution = "MOONDECK_AUTO_RES",
  LinkedAudio = "MOONDECK_LINKED_AUDIO",
  LinkedDisplay = "MOONDECK_LINKED_DISPLAY",
  SteamAppId = "MOONDECK_STEAM_APP_ID",
  AppName = "MOONDECK_APP_NAME",
  Python = "MOONDECK_PYTHON"
}

export enum AppType {
  MoonDeck,
  GameStream,
  NonSteam
}

export function registerForGameLifetime(callback: (data: AppLifetimeNotification) => void): () => void {
  const unregisterable = SteamClient.GameSessions.RegisterForAppLifetimeNotifications(callback);
  return () => unregisterable.unregister();
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

export async function getAppDetailsForAppIds(appIds: number[]): Promise<AppDetails[]> {
  const tasks = appIds.map((appid) => async () => await getAppDetails(appid));
  return (await throttleAll(100, tasks)).filter((details) => details !== null);
}

export async function getAllNonSteamAppDetails(): Promise<AppDetails[]> {
  const appIds = getAllNonSteamAppIds();
  return await getAppDetailsForAppIds(appIds);
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
