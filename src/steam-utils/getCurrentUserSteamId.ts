import { logger } from "../lib/logger";

/**
 * @returns The current SteamId of the current user.
 */
export function getCurrentUserSteamId(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    return (window as any).App.m_CurrentUser.strSteamID as string;
  } catch (error) {
    logger.critical(error);
    return null;
  }
}
