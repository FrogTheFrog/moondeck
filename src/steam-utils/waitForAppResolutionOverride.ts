import { getAppResolutionOverride } from "./getAppResolutionOverride";
import { waitForPredicate } from "./shared";

export type AppResolutionOverridePredicate = (value: string | null) => (boolean | Promise<boolean>);

/**
 * Convenience function for waiting until app resolution override is in desired state.
 */
export async function waitForAppResolutionOverride(appId: number, predicate: AppResolutionOverridePredicate): Promise<boolean> {
  return await waitForPredicate(3, 250, async () => {
    const value = await getAppResolutionOverride(appId);
    return await predicate(value);
  });
}
