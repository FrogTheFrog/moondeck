import { AppType, EnvVars, addAppsToCollection, addShortcut, checkExecPathMatch, getAppDetailsForAppIds, getAppStoreEx, getMoonDeckRunPath, getOrCreateCollection, removeAppsFromCollection, removeShortcut, restartSteamClient, setAppLaunchOptions } from "./steamutils";
import { HostSettings, SettingsManager } from "./settingsmanager";
import { getEnvKeyValueString, makeEnvKeyValue } from "./envutils";
import { AppDetails } from "@decky/ui/dist/globals/steam-client/App";
import { AppSyncState } from "./appsyncstate";
import { BehaviorSubject } from "rxjs";
import { BuddyProxy } from "./buddyproxy";
import { ReadonlySubject } from "./readonlysubject";
import { logger } from "./logger";

export interface GameStreamAppInfo {
  appId: number;
  appName: string;
  appType: AppType.GameStream;
}

export interface NonSteamAppInfo {
  appId: number;
  appName: string;
  appType: AppType.NonSteam;
}

export type ExternalAppInfo = GameStreamAppInfo | NonSteamAppInfo;
export type ExternalAppType = ExternalAppInfo["appType"];

export interface ManagedApp {
  appId: number;
  appName: string;
  appType: ExternalAppType;
  gameId: string;
}

interface GameStreamHostData {
  appType: AppType.GameStream;
  appName: string;
  entryId: string;
  entryType: EnvVars.AppName;
}

interface NonSteamHostData {
  appType: AppType.NonSteam;
  appName: string;
  appId: string;
  entryId: string;
  entryType: EnvVars.SteamAppId;
}

type HostData = GameStreamHostData | NonSteamHostData;

async function getHostData(appType: ExternalAppType, buddyProxy: BuddyProxy, hostSettings: HostSettings): Promise<HostData[] | null> {
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
    gameStreamApps = gameStreamApps.filter(app => !moonDeckHostApps.includes(app));
    return gameStreamApps.map((appName) => { return { appType: AppType.GameStream, appName, entryId: appName, entryType: EnvVars.AppName }; });
  }

  const nonSteamApps = await buddyProxy.getNonSteamAppData();
  if (nonSteamApps === null) {
    logger.toast("Failed to get Non-Steam app data!", { output: "error" });
    return null;
  }

  return nonSteamApps.map(({ app_id: appId, app_name: appName }) => { return { appType: AppType.NonSteam, appId, appName, entryId: appId, entryType: EnvVars.SteamAppId }; });
}

function makeLaunchOptions(data: HostData): string {
  const launchOptions: string[] = [];
  launchOptions.push(`${makeEnvKeyValue(EnvVars.AppType, data.appType)}`);
  launchOptions.push(`${makeEnvKeyValue(data.entryType, data.entryId)}`);
  launchOptions.push("%command%");
  return launchOptions.join(" ");
}

async function updateLaunchOptions(appId: number, data: HostData): Promise<boolean> {
  if (!await setAppLaunchOptions(appId, makeLaunchOptions(data))) {
    logger.error(`Failed to set shortcut launch options for ${data.appName}!`);
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
  private readonly managedApps: Map<number, ManagedApp> = new Map();

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
        updatedMap.delete(change.name);
        this.managedApps.delete(change.name);
        this.appInfoSubject.next(updatedMap);
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
    const addAppInfo = (details: AppDetails, appType: ExternalAppType): void => { appInfo.set(details.unAppID, { appId: details.unAppID, appName: details.strDisplayName, appType }); };
    for (const details of appDetails) {
      const overview = appStoreEx.getAppOverview(details.unAppID);
      if (overview === null) {
        logger.error(`Could not get app store overview for ${details.unAppID} while processing details!`);
        continue;
      }

      // Add app info for legacy GameStream apps so that they can be removed/updated.
      if (details.strLaunchOptions.includes("MOONDECK_MANAGED=1")) {
        addAppInfo(details, AppType.GameStream);
        continue;
      }

      if (details.strLaunchOptions.includes(makeEnvKeyValue(EnvVars.AppType, AppType.GameStream))) {
        const appType = AppType.GameStream;
        this.managedApps.set(details.unAppID, { appId: details.unAppID, appName: details.strDisplayName, appType, gameId: overview.gameid });
        addAppInfo(details, appType);
        continue;
      }

      if (details.strLaunchOptions.includes(makeEnvKeyValue(EnvVars.AppType, AppType.NonSteam))) {
        const appType = AppType.NonSteam;
        this.managedApps.set(details.unAppID, { appId: details.unAppID, appName: details.strDisplayName, appType, gameId: overview.gameid });
        addAppInfo(details, appType);
        continue;
      }
    }

    this.appInfoSubject.next(new Map([...this.appInfoSubject.value, ...appInfo]));
  }

  private async removeApps(appIds: number[]): Promise<boolean> {
    let success = true;
    const updatedMap = new Map([...this.appInfoSubject.value]);

    for (const appId of appIds) {
      this.appSyncState.incrementCount();
      success = await removeShortcut(appId) && success;
      updatedMap.delete(appId);
      this.managedApps.delete(appId);
    }

    this.appInfoSubject.next(updatedMap);
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
    this.managedApps.clear();

    if (this.unregisterCallback !== null) {
      this.unregisterCallback();
      this.unregisterCallback = null;
    }

    if (this.unobserveCallback !== null) {
      this.unobserveCallback();
      this.unobserveCallback = null;
    }
  }

  getEntryByGameId(gameId: string): ManagedApp | null {
    for (const [, value] of this.managedApps.entries()) {
      if (value.gameId === gameId) {
        return value;
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
        if (appType === AppType.GameStream) {
          const appName = getEnvKeyValueString(shortcut.strLaunchOptions, EnvVars.AppName);
          if (appName !== null) {
            existingApps.set(`${EnvVars.AppName}_${appName}`, shortcut);
            continue;
          }
        } else if (appType === AppType.NonSteam) {
          const appId = getEnvKeyValueString(shortcut.strLaunchOptions, EnvVars.SteamAppId);
          if (appId !== null) {
            existingApps.set(`${EnvVars.SteamAppId}_${appId}`, shortcut);
            continue;
          }
        }

        // Add app to the map so that it's deleted later
        existingApps.set(`${shortcut.unAppID}`, shortcut);
      }

      const appsToAdd: HostData[] = [];
      const appsToRemove: number[] = [];
      let success = true;

      // Check which apps need to be added or updated
      for (const data of hostData) {
        const details = existingApps.get(`${data.entryType}_${data.entryId}`);
        if (!details) {
          appsToAdd.push(data);
        } else if (!checkExecPathMatch(execPath, details.strShortcutExe)) {
          appsToRemove.push(details.unAppID);
          appsToAdd.push(data);
        }
      }

      // Check which ones are no longer in the list and needs to be removed
      for (const [key, details] of existingApps) {
        if (!hostData.find((data) => `${data.entryType}_${data.entryId}` === key)) {
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
          success = await updateLaunchOptions(appId, app) && success;
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

  async updateCollection(): Promise<void> {
    const collectionTag = "MoonDeck";
    const collection = await getOrCreateCollection(collectionTag, true);
    if (collection !== null || this.managedApps.size > 0) {
      const collectionApps = collection ? Array.from(collection.apps.keys()) : [];
      const someRandomApps = collectionApps.filter((appId) => !this.managedApps.has(appId));

      await addAppsToCollection(collectionTag, Array.from(this.managedApps.keys()));
      await removeAppsFromCollection(collectionTag, someRandomApps);
    }
  }
}
