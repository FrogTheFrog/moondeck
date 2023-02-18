import { SteamClientEx } from "./shared";
import { logger } from "../lib/logger";

/**
 * Invokes appropriate callback when user logs in or out.
 *
 * @note
 * Either login or logout callback will be invoked based on the
 * current state once this function is called.
 */
export function registerForLoginStateChange(onLogin: (username: string) => void, onLogout: () => void): () => void {
  try {
    let isLoggedIn: boolean | null = null;
    return (SteamClient as SteamClientEx).User.RegisterForLoginStateChange((username: string) => {
      if (username === "") {
        if (isLoggedIn !== false) {
          onLogout();
        }
        isLoggedIn = false;
      } else {
        if (isLoggedIn !== true) {
          onLogin(username);
        }
        isLoggedIn = true;
      }
    }).unregister;
  } catch (error) {
    logger.critical(error);
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return () => { };
  }
}
