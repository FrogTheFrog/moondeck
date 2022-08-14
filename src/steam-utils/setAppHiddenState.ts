import { getCollectionStore } from "./getCollectionStore";
import { sleep } from "decky-frontend-lib";
import { waitForAppOverview } from "./waitForAppOverview";

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
 *
 * Tries to hide or unhide the app.
 * @note
 * hiding the app will remove it from other collections!
 *
 * @param appId app id to change the hidden state for.
 * @param hide specifies whether to hide or unhide the app.
 * @returns True if state matches the desired one, false otherwise.
 */
export async function setAppHiddenState(appId: number, hide: boolean): Promise<boolean> {
  if (!await waitForAppOverview(appId, (overview) => overview !== null)) {
    console.log(`Could not set hidden state for app ${appId} - does not exist!`);
    return false;
  }

  const collectionStore = getCollectionStore();
  if (collectionStore === null) {
    console.log(`Could not set hidden state for app ${appId} - null collectionStore!`);
    return false;
  }

  try {
    if (collectionStore.BIsHidden(appId) === hide) {
      return true;
    }

    collectionStore.SetAppsAsHidden([appId], hide);
    if (!await waitForPredicate(3, 250, () => collectionStore.BIsHidden(appId) === hide)) {
      console.log(`Could not set hidden state for app ${appId} - state did not change!`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}
