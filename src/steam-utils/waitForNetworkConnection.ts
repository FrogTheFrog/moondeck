import { getSystemNetworkStore } from "./getSystemNetworkStore";
import { waitForPredicate } from "./shared";

/**
 * Convenience function for waiting until network connection is available.
 */
export async function waitForNetworkConnection(): Promise<boolean> {
  return await waitForPredicate(20, 250, () => {
    return getSystemNetworkStore()?.hasNetworkConnection ?? false;
  });
}
