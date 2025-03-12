import { AppType, EnvVars, getAppStoreEx } from "./steamutils";
import { AppDetails } from "@decky/ui";
import { BehaviorSubject } from "rxjs";
import { ReadonlySubject } from "./readonlysubject";
import { logger } from "./logger";
import { makeEnvKeyValue } from "./envutils";

export type ExternalAppType = AppType.GameStream;
export interface ExternalAppInfo {
  appId: number;
  appName: string;
  appType: ExternalAppType;
}

export interface ManagedApp {
  appId: number;
  appName: string;
  appType: ExternalAppType;
  gameId: string;
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
        this.managedApps.delete(change.name);
      }
    });
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

  processAppDetails(appDetails: AppDetails[]): void {
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
    }

    this.appInfoSubject.next(new Map([...this.appInfoSubject.value, ...appInfo]));
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
}
