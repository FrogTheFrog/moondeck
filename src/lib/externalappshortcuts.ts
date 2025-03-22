import { AppType, EnvVars, addShortcut, checkExecPathMatch, getAppDetailsForAppIds, getAppStoreEx, getMoonDeckRunPath, removeShortcut, restartSteamClient, setAppLaunchOptions } from "./steamutils";
import { HostSettings, SettingsManager } from "./settingsmanager";
import { getEnvKeyValueString, makeEnvKeyValue } from "./envutils";
import { AppDetails } from "@decky/ui";
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
}

interface NonSteamHostData {
  appType: AppType.NonSteam;
  appName: string;
  appId: string;
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
    return gameStreamApps.map((appName) => { return { appType: AppType.GameStream, appName }; });
  }

  const nonSteamApps = await buddyProxy.getNonSteamAppData();
  if (nonSteamApps === null) {
    logger.toast("Failed to get Non-Steam app data!", { output: "error" });
    return null;
  }

  return nonSteamApps.map(({ appId, appName }) => { return { appType: AppType.NonSteam, appId, appName }; });
}

function makeLaunchOptions(data: HostData): string {
  const launchOptions: string[] = [];
  launchOptions.push(`${makeEnvKeyValue(EnvVars.AppType, data.appType)}`);

  if (data.appType === AppType.GameStream) {
    launchOptions.push(`${makeEnvKeyValue(EnvVars.AppName, data.appName)}`);
  } else {
    launchOptions.push(`${makeEnvKeyValue(EnvVars.SteamAppId, data.appId)}`);
  }

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
  private readonly syncingSubject = new BehaviorSubject<boolean>(false);
  private readonly managedApps: Map<number, ManagedApp> = new Map();

  readonly appInfo = new ReadonlySubject(this.appInfoSubject);
  readonly syncing = new ReadonlySubject(this.syncingSubject);

  private initAppStoreObservable(): void {
    const appStoreEx = getAppStoreEx();
    if (appStoreEx === null) {
      logger.error("appStoreEx is null!");
      return;
    }

    this.unobserveCallback = appStoreEx.observe((change) => {
      if (change.type === "delete") {
        this.managedApps.delete(change.name);
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

      // Add app info for legacy Sunshine apps so that they can be removed/updated.
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

  constructor(private readonly buddyProxy: BuddyProxy, private readonly settingsManager: SettingsManager) {
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

    if (this.syncingSubject.value) {
      return;
    }

    try {
      this.syncingSubject.next(true);

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
        existingApps.set(shortcut.strDisplayName, shortcut);
      }

      const appsToAdd: HostData[] = [];
      const appsToUpdate: Array<{ appId: number; data: HostData }> = [];
      const appsToRemove: number[] = [];
      let success = true;

      // Check which apps need to be added or updated
      for (const data of hostData) {
        const details = existingApps.get(data.appName);
        if (!details) {
          appsToAdd.push(data);
        } else if (!checkExecPathMatch(execPath, details.strShortcutExe)) {
          appsToRemove.push(details.unAppID);
          appsToAdd.push(data);
        } else {
          if (data.appType === AppType.GameStream) {
            if (data.appName !== getEnvKeyValueString(details.strLaunchOptions, EnvVars.AppName)) {
              appsToUpdate.push({ appId: details.unAppID, data });
            }
          } else {
            if (data.appId !== getEnvKeyValueString(details.strLaunchOptions, EnvVars.SteamAppId)) {
              appsToUpdate.push({ appId: details.unAppID, data });
            }
          }
        }
      }

      // Update the launch options only
      for (const { appId, data } of appsToUpdate) {
        success = await updateLaunchOptions(appId, data) && success;
      }

      // Check which ones are no longer in the list and needs to be removed
      for (const [name, details] of existingApps) {
        if (!hostData.find((data) => data.appName === name)) {
          appsToRemove.push(details.unAppID);
        }
      }

      // Actually generate shortcuts
      const addedAppIds: Set<number> = new Set();
      for (const app of appsToAdd) {
        const appId = await addExternalShortcut(app.appName, execPath);
        if (appId !== null) {
          addedAppIds.add(appId);
          success = await updateLaunchOptions(appId, app) && success;
        } else {
          success = false;
        }
      }

      // Remove them bastards!
      for (const appId of appsToRemove) {
        success = await removeShortcut(appId) && success;
      }

      if (appsToAdd.length > 0 || appsToUpdate.length > 0 || appsToRemove.length > 0) {
        if (appsToRemove.length > 0) {
          restartSteamClient();
        } else {
          const newDetails = await getAppDetailsForAppIds(Array.from(addedAppIds));
          success = newDetails.length === addedAppIds.size && success;
          this.processAppDetails(newDetails); // Proccess details regardless of success

          if (success) {
            logger.toast(`${appsToAdd.length + appsToUpdate.length}/${hostData.length} app(s) were synced.`, { output: "log" });
          } else {
            logger.toast("Some app(s) failed to sync.", { output: "error" });
          }
        }
      } else {
        logger.toast("Apps are in sync.", { output: "log" });
      }
    } catch (error) {
      logger.critical(error);
    } finally {
      this.syncingSubject.next(false);
    }
  }

  async purgeShortcuts(appType: ExternalAppType): Promise<void> {
    if (this.initializing) {
      logger.toast("Plugin is still initializing!", { output: "error" });
      return;
    }

    if (this.syncingSubject.value) {
      return;
    }

    try {
      this.syncingSubject.next(true);

      const appIds = Array.from(this.appInfo.value)
        .filter(([, info]) => info.appType === appType)
        .map(([appId]) => appId);
      for (const appId of appIds) {
        await removeShortcut(appId);
      }

      if (appIds.length > 0) {
        restartSteamClient();
      }
    } catch (error) {
      logger.critical(error);
    } finally {
      this.syncingSubject.next(false);
    }
  }
}
