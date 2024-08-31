import { getSystemNetworkStore } from "./getSystemNetworkStore";
import { waitForPredicate } from "./shared";

/**
 * Convenience function for waiting until network connection is available.
 */
export async function waitForNetworkConnection(timeoutInSecs: number): Promise<boolean> {
  const delay = 250;
  return await waitForPredicate((timeoutInSecs * 1000) / delay, delay, () => {
    return getSystemNetworkStore()?.hasNetworkConnection ?? false;
  });
}
