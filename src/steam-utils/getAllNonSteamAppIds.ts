import { SteamShortcut } from "decky-frontend-lib";
import { getCollectionStore } from "./getCollectionStore";
import { logger } from "../lib/logger";

export interface SteamClientBeforeBeta {
  Apps: {
    GetAllShortcuts?: () => Promise<SteamShortcut[]>;
  };
}

/**
 * @returns all the ids for the Non-Steam apps.
 */
export async function getAllNonSteamAppIds(): Promise<number[]> {
  try {
    const GetAllShortcuts = (SteamClient as SteamClientBeforeBeta).Apps.GetAllShortcuts;
    if (GetAllShortcuts) {
      return (await GetAllShortcuts()).map((shortcut) => shortcut.appid);
    }

    const collectionStore = getCollectionStore();
    if (collectionStore === null) {
      logger.error("Could not get all Non-Steam app ids - null collectionStore!");
      return [];
    }

    return Array.from(collectionStore.deckDesktopApps.apps.keys());
  } catch (error) {
    logger.critical(error);
    return [];
  }
}
