import { AppDetails } from "@decky/ui";
import { waitForAppDetails } from "./waitForAppDetails";

/**
 * Tries to retrieve the app details from Steam.
 *
 * @param appId id to get details for.
 * @returns AppDetails if succeeded or null otherwise.
 */
export async function getAppDetails(appId: number): Promise<AppDetails | null> {
  return (await waitForAppDetails(appId, (_) => true)).details;
}
