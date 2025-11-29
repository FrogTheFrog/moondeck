import { logger } from "../lib/logger";

/**
 * @returns The current SteamId of the current user.
 */
export function getCurrentUserSteamId(): string | null {
  try {
    return window.App.m_CurrentUser.strSteamID;
  } catch (error) {
    logger.critical(error);
    return null;
  }
}
