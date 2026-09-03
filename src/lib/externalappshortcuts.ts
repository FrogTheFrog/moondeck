import { AppStoreOverview, AppType, EnvVars, addAppsToCollection, addShortcut, checkExecPathMatch, getAppDetailsForAppIds, getAppStoreEx, getMoonDeckRunPath, getOrCreateCollection, isMoonDeckShortcut, removeAppsFromCollection, removeShortcut, restartSteamClient, setAppLaunchOptions } from "./steamutils";
import { HostSettings, SettingsManager } from "./settingsmanager";
import { getEnvKeyValueNumber, getEnvKeyValueString, makeEnvKeyValue } from "./envutils";
import { AppDetails } from "@decky/ui/dist/globals/steam-client/App";
import { AppSyncState } from "./appsyncstate";
import { BehaviorSubject } from "rxjs";
import { BuddyProxy } from "./buddyproxy";
import { ReadonlySubject } from "./readonlysubject";
import { isEqual } from "lodash";
import { logger } from "./logger";

export interface AppInfo {
  appId: number;
  appName: string;
  gameId: string;
  entryId: string | null;
  manuallyLinkedApp?: number | null;
}
export interface GameStreamAppInfo extends AppInfo {
  appType: AppType.GameStream;
}
export interface NonSteamAppInfo extends AppInfo {
  appType: AppType.NonSteam;
}

export type ExternalAppInfo = GameStreamAppInfo | NonSteamAppInfo;
export type ExternalAppType = ExternalAppInfo["appType"];

interface HostData {
  appName: string;
  entryId: string;
}
interface GameStreamHostData extends HostData {
  appType: AppType.GameStream;
}
interface NonSteamHostData extends HostData {
  appType: AppType.NonSteam;
}
type ExternalHostData = GameStreamHostData | NonSteamHostData;

async function getHostData(appType: ExternalAppType, buddyProxy: BuddyProxy, hostSettings: HostSettings): Promise<ExternalHostData[] | null> {
  if (appType === AppType.GameStream) {
    let gameStreamApps = await buddyProxy.getGameStreamAppNames();
    if (gameStreamApps === null) {
      logger.toast("Failed to get GameStream app list!", { output: "error" });
      return null;
    }

    const moonDeckHostApps = hostSettings.buddy.hostApp.apps;
    if (!moonDeckHostApps.includes("MoonDeckStream")) {
      moonDeckHostApps.push("MoonDeckStream");
    }

    // Filter out the custom MoonDeck host apps
    gameStreamApps = gameStreamApps.filter((app) => !moonDeckHostApps.includes(app));
    return gameStreamApps.map((appName) => { return { appType: AppType.GameStream, appName, entryId: appName }; });
  }

  const nonSteamApps = await buddyProxy.getNonSteamAppData();
  if (nonSteamApps === null) {
    logger.toast("Failed to get Non-Steam app data!", { output: "error" });
    return null;
  }

  return nonSteamApps.map(({ app_id: appId, app_name: appName }) => { return { appType: AppType.NonSteam, appName, entryId: appId }; });
}

function mapAppTypeToEnv(appType: ExternalAppType) {
  switch (appType) {
    case AppType.GameStream:
      return EnvVars.AppName;
    case AppType.NonSteam:
      return EnvVars.SteamAppId;
  }
}

function makeLaunchOptions(appType: ExternalAppType, entryId: string, manuallyLinkedApp?: number | null): string {
  const launchOptions: string[] = [];
  launchOptions.push(`${makeEnvKeyValue(EnvVars.AppType, appType)}`);
  launchOptions.push(`${makeEnvKeyValue(mapAppTypeToEnv(appType), entryId)}`);

  if (manuallyLinkedApp !== undefined) {
    launchOptions.push(`${makeEnvKeyValue(EnvVars.ManuallyLinkedApp, manuallyLinkedApp === null ? "null" : manuallyLinkedApp)}`);
  }

  launchOptions.push("%command%");
  return launchOptions.join(" ");
}

function parseManuallyLinkedApp(launchOptions: string): number | null | undefined {
  const valueString = getEnvKeyValueString(launchOptions, EnvVars.ManuallyLinkedApp);
  if (valueString === null) {
    return undefined;
  }

  if (valueString === "null") {
    return null;
  }

  const valueNumber = Number(valueString);
  if (Number.isNaN(valueNumber)) {
    logger.error(`Failed to convert ENV key ${EnvVars.ManuallyLinkedApp} value to a number. ENV string: ${valueString}`);
    return undefined;
  }

  return valueNumber;
}

async function updateLaunchOptions(appId: number, appName: string, appType: ExternalAppType, entryId: string, manuallyLinkedApp?: number | null): Promise<boolean> {
  if (!await setAppLaunchOptions(appId, makeLaunchOptions(appType, entryId, manuallyLinkedApp))) {
    logger.error(`Failed to set shortcut launch options for ${appName}!`);
    return false;
  }
  return true;
}

async function addExternalShortcut(appName: string, moonlightExecPath: string): Promise<number | null> {
  const appId = await addShortcut(appName, moonlightExecPath);
  if (appId == null) {
    logger.error(`Failed to add ${appName} shortcut!`);
    return null;
  }

  return appId;
}

export class ExternalAppShortcuts {
  private unobserveCallback: (() => void) | null = null;
  private unregisterCallback: (() => void) | null = null;
  private doneInitializing = false;
  private readonly appInfoSubject = new BehaviorSubject<Map<number, ExternalAppInfo>>(new Map());

  readonly appInfo = new ReadonlySubject(this.appInfoSubject);

  private initAppStoreObservable(): void {
    const appStoreEx = getAppStoreEx();
    if (appStoreEx === null) {
      logger.error("appStoreEx is null!");
      return;
    }

    this.unobserveCallback = appStoreEx.observe((change) => {
      if (change.type === "delete") {
        const updatedMap = new Map([...this.appInfoSubject.value]);
        if (updatedMap.delete(change.name)) {
          this.appInfoSubject.next(updatedMap);
        }
      }
    });
  }

  private processAppDetails(appDetails: AppDetails[]): void {
    const appStoreEx = getAppStoreEx();
    if (appStoreEx === null) {
      logger.error("Could not get app store overview for processing app details - appStoreEx is null!");
      return;
    }

    const appInfo: Map<number, ExternalAppInfo> = new Map();
    const addAppInfo = (details: AppDetails, overview: AppStoreOverview, appType: ExternalAppType, entryId: string | null, manuallyLinkedApp?: number | null): void => {
      appInfo.set(details.unAppID, { appId: details.unAppID, appName: details.strDisplayName, appType, gameId: overview.gameid, entryId, manuallyLinkedApp });
    };
    for (const details of appDetails) {
      const overview = appStoreEx.getAppOverview(details.unAppID);
      if (overview === null) {
        logger.error(`Could not get app store overview for ${details.unAppID} while processing details!`);
        continue;
      }

      // Add app info for legacy GameStream apps so that they can be removed/updated.
      if (details.strLaunchOptions.includes("MOONDECK_MANAGED=1")) {
        addAppInfo(details, overview, AppType.GameStream, null, undefined);
        continue;
      }

      const appType = getEnvKeyValueNumber(details.strLaunchOptions, EnvVars.AppType) as AppType | null;
      if (appType === AppType.GameStream || appType === AppType.NonSteam) {
        // If entryId is null, it's fine since user can re-sync it, but not launch it, since it's borked...
        const entryId = getEnvKeyValueString(details.strLaunchOptions, mapAppTypeToEnv(appType));
        const manuallyLinkedApp = parseManuallyLinkedApp(details.strLaunchOptions);
        addAppInfo(details, overview, appType, entryId, manuallyLinkedApp);
        continue;
      }
    }

    for (const [appId, info] of appInfo) {
      if (isEqual(this.appInfoSubject.value.get(appId), info)) {
        continue;
      }

      // at least one app info is different, merge everything with existing data
      this.appInfoSubject.next(new Map([...this.appInfoSubject.value, ...appInfo]));
      break;
    }
  }

  private async removeApps(appIds: number[]): Promise<boolean> {
    let success = true;
    const updatedMap = new Map([...this.appInfoSubject.value]);

    for (const appId of appIds) {
      this.appSyncState.incrementCount();
      success = await removeShortcut(appId) && success;
      updatedMap.delete(appId);
    }

    if (!isEqual(updatedMap, this.appInfoSubject.value)) {
      this.appInfoSubject.next(updatedMap);
    }
    return success;
  }

  constructor(private readonly appSyncState: AppSyncState, private readonly buddyProxy: BuddyProxy, private readonly settingsManager: SettingsManager) {
  }

  init(allDetails: AppDetails[]): void {
    this.initAppStoreObservable();

    this.processAppDetails(allDetails);
    this.doneInitializing = true;
  }

  deinit(): void {
    this.doneInitializing = false;
    if (this.appInfoSubject.value.size > 0) {
      this.appInfoSubject.next(new Map());
    }

    if (this.unregisterCallback !== null) {
      this.unregisterCallback();
      this.unregisterCallback = null;
    }

    if (this.unobserveCallback !== null) {
      this.unobserveCallback();
      this.unobserveCallback = null;
    }
  }

  getValidEntryByGameId(gameId: string): ExternalAppInfo | null {
    for (const [, value] of this.appInfoSubject.value.entries()) {
      if (value.gameId === gameId) {
        return value.entryId === null ? null : value;
      }
    }
    return null;
  }

  get initializing(): boolean {
    return !this.doneInitializing;
  }

  async syncShortcuts(appType: ExternalAppType): Promise<void> {
    if (this.initializing) {
      logger.toast("Plugin is still initializing!", { output: "error" });
      return;
    }

    if (this.appSyncState.getState().syncing) {
      return;
    }

    try {
      this.appSyncState.setState(false, appType);

      const hostSettings = this.settingsManager.hostSettings;
      if (hostSettings === null) {
        logger.toast("Host is not selected!", { output: "error" });
        return;
      }

      const execPath = await getMoonDeckRunPath();
      if (execPath === null) {
        logger.toast("Failed to get moondeckrun.sh path!", { output: "error" });
        return;
      }

      const hostData = await getHostData(appType, this.buddyProxy, hostSettings);
      if (hostData === null) {
        // Error already logged
        return;
      }

      const currentAppDetails = await getAppDetailsForAppIds(
        Array.from(this.appInfo.value)
          .filter(([, info]) => info.appType === appType)
          .map(([appId]) => appId));

      const existingApps = new Map<string, AppDetails>();
      for (const shortcut of currentAppDetails) {
        const entryId = getEnvKeyValueString(shortcut.strLaunchOptions, mapAppTypeToEnv(appType));
        if (entryId !== null) {
          existingApps.set(`${appType}_${entryId}`, shortcut);
          continue;
        }

        // Add app to the map so that it's deleted later
        existingApps.set(`${shortcut.unAppID}`, shortcut);
      }

      const appsToAdd: ExternalHostData[] = [];
      const appsToRemove: number[] = [];
      let success = true;

      // Check which apps need to be added or updated
      for (const data of hostData) {
        const details = existingApps.get(`${data.appType}_${data.entryId}`);
        if (!details) {
          appsToAdd.push(data);
        } else if (!checkExecPathMatch(execPath, details.strShortcutExe)) {
          appsToRemove.push(details.unAppID);
          appsToAdd.push(data);
        }
      }

      // Check which ones are no longer in the list and needs to be removed
      for (const [key, details] of existingApps) {
        if (!hostData.find((data) => `${data.appType}_${data.entryId}` === key)) {
          appsToRemove.push(details.unAppID);
        }
      }

      this.appSyncState.setMax(appsToAdd.length + appsToRemove.length);

      // Actually generate shortcuts
      const addedAppIds: Set<number> = new Set();
      for (const app of appsToAdd) {
        this.appSyncState.incrementCount();
        const appId = await addExternalShortcut(app.appName, execPath);
        if (appId !== null) {
          addedAppIds.add(appId);
          success = await updateLaunchOptions(appId, app.appName, app.appType, app.entryId) && success;
        } else {
          success = false;
        }
      }

      // Remove them bastards!
      await this.removeApps(appsToRemove);

      if (appsToAdd.length > 0 || appsToRemove.length > 0) {
        const newDetails = await getAppDetailsForAppIds(Array.from(addedAppIds));
        success = newDetails.length === addedAppIds.size && success;
        this.processAppDetails(newDetails); // Proccess details regardless of success
        await this.updateCollection();

        if (appsToRemove.length > 0) {
          restartSteamClient();
        } else {
          if (success) {
            logger.toast(`${appsToAdd.length}/${hostData.length} app(s) were synced.`, { output: "log" });
          } else {
            logger.toast("Some app(s) failed to sync.", { output: "error" });
          }
        }
      } else {
        await this.updateCollection();
        logger.toast("Apps are in sync.", { output: "log" });
      }
    } catch (error) {
      logger.critical(error);
    } finally {
      this.appSyncState.resetState();
    }
  }

  async purgeShortcuts(appType: ExternalAppType): Promise<void> {
    if (this.initializing) {
      logger.toast("Plugin is still initializing!", { output: "error" });
      return;
    }

    if (this.appSyncState.getState().syncing) {
      return;
    }

    try {
      this.appSyncState.setState(true, appType);

      const appIds = Array.from(this.appInfo.value)
        .filter(([, info]) => info.appType === appType)
        .map(([appId]) => appId);

      this.appSyncState.setMax(appIds.length);

      await this.removeApps(appIds);
      if (appIds.length > 0) {
        await this.updateCollection();
        restartSteamClient();
      }
    } catch (error) {
      logger.critical(error);
    } finally {
      this.appSyncState.resetState();
    }
  }

  async setManuallyLinkedApp(appId: number, linkedApp: number | null | undefined): Promise<void> {
    const entry = this.appInfoSubject.value.get(appId);
    if (!entry || entry.entryId === null) {
      logger.toast(`App ${appId} cannot be linked/unlinked as it is not a valid entry!`, { output: "error" });
      return;
    }

    if (entry.manuallyLinkedApp === linkedApp) {
      return;
    }

    if (await updateLaunchOptions(appId, entry.appName, entry.appType, entry.entryId, linkedApp)) {
      entry.manuallyLinkedApp = linkedApp;
      this.appInfoSubject.next(new Map([...this.appInfoSubject.value]));
    }
  }

  async removeManuallyLinkedApp(appId: number): Promise<void> {
    await this.setManuallyLinkedApp(appId, undefined);
  }

  async updateCollection(): Promise<void> {
    const collectionTag = "MoonDeck";
    const collection = await getOrCreateCollection(collectionTag, true);
    if (collection !== null || this.appInfoSubject.value.size > 0) {
      const collectionApps = collection ? Array.from(collection.apps.keys()) : [];
      const someRandomApps = collectionApps.filter((appId) => !this.appInfoSubject.value.has(appId));

      let leftoverMoonDeckApps: number[] = [];
      if (collection) {
        const possiblyLeftoverApps = Array.from(collection.allApps.values())
          .filter((item) => someRandomApps.includes(item.appid))
          .filter((item) => `${item.appid}` != item.gameid) // Not a normal Steam app
          .map((item) => item.appid);

        leftoverMoonDeckApps = (await getAppDetailsForAppIds(possiblyLeftoverApps))
          .filter((item) => isMoonDeckShortcut(item))
          .map((item) => item.unAppID);
      }

      await addAppsToCollection(collectionTag, Array.from(this.appInfoSubject.value.keys()));
      await removeAppsFromCollection(collectionTag, leftoverMoonDeckApps);
    }
  }
}
