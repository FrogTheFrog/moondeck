import { getSystemNetworkStore } from "./getSystemNetworkStore";
import { sleep } from "decky-frontend-lib";

async function waitForPredicate(retries: number, delay: number, predicate: () => (boolean | Promise<boolean>)): Promise<boolean> {
  const waitImpl = async (): Promise<boolean> => {
    try {
      let tries = retries + 1;
      while (tries-- !== 0) {
        if (await predicate()) {
          return true;
        }

        if (tries > 0) {
          await sleep(delay);
        }
      }
    } catch (error) {
      console.error(error);
    }

    return false;
  };

  return await waitImpl();
}

/**
 * Convenience function for waiting until network connection is available.
 */
export async function waitForNetworkConnection(): Promise<boolean> {
  return await waitForPredicate(20, 250, () => {
    return getSystemNetworkStore()?.hasNetworkConnection ?? false;
  });
}
