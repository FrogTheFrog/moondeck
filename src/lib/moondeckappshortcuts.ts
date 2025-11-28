import { AppType, EnvVars, addShortcut, getAppStoreEx, removeShortcut, restartSteamClient } from "./steamutils";
import { getEnvKeyValueNumber, makeEnvKeyValue } from "./envutils";
import { AppDetails } from "@decky/ui/dist/globals/steam-client/App";
import { AppOverviewPatcher } from "./appoverviewpatcher";
import { AppSyncState } from "./appsyncstate";
import { BehaviorSubject } from "rxjs";
import BiMap from "ts-bidirectional-map";
import { ReadonlySubject } from "./readonlysubject";
import { logger } from "./logger";

export interface MoonDeckAppInfo {
  appId: number;
  appName: string;
}

export class MoonDeckAppShortcuts {
  private unobserveCallback: (() => void) | null = null;
  private keyMapping: BiMap<number, number> | null = null;
  private readonly appInfoSubject = new BehaviorSubject<Map<number, MoonDeckAppInfo>>(new Map());
  private readonly appOverviewPatcher = new AppOverviewPatcher({
    rt_last_time_locally_played: (currentValue, newValue) => typeof currentValue !== "number" || (typeof newValue === "number" && newValue > currentValue)
  });

  readonly appInfo = new ReadonlySubject(this.appInfoSubject);

  private initAppStoreObservable(): void {
    const appStoreEx = getAppStoreEx();
    if (appStoreEx === null) {
      logger.error("appStoreEx is null!");
      return;
    }

    this.unobserveCallback = appStoreEx.observe((change) => {
      if (change.type !== "delete") {
        return;
      }

      if (this.keyMapping?.hasValue(change.name) === false) {
        return;
      }

      this.removeShortcut(change.name, false).catch((e) => logger.critical(e));
    });
  }

  private filterMoonDeckApps(allDetails: AppDetails[]): AppDetails[] {
    const moonDeckApps: AppDetails[] = [];

    for (const details of allDetails) {
      if (details !== null) {
        const hasCorrectExec = details.strShortcutExe.includes("moondeckrun.sh");

        // First check is needed for backwards compat.
        const hasCorrectLaunchOptions = !details.strLaunchOptions.includes(EnvVars.AppType) ||
          details.strLaunchOptions.includes(makeEnvKeyValue(EnvVars.AppType, AppType.MoonDeck));

        if (hasCorrectExec && hasCorrectLaunchOptions) {
          moonDeckApps.push(details);
        }
      }
    }

    return moonDeckApps;
  }

  constructor(private readonly appSyncState: AppSyncState) {
  }

  init(allDetails: AppDetails[]): void {
    this.initAppStoreObservable();
    this.appOverviewPatcher.init();
    this.keyMapping = new BiMap();

    const appInfo: Map<number, MoonDeckAppInfo> = new Map();
    let shortcutsPurgeIsNeeded = false;
    for (const details of this.filterMoonDeckApps(allDetails)) {
      const steamAppId = getEnvKeyValueNumber(details.strLaunchOptions, EnvVars.SteamAppId);
      if (steamAppId === null || steamAppId in this.keyMapping) {
        shortcutsPurgeIsNeeded = true;
        continue;
      }

      this.keyMapping.set(steamAppId, details.unAppID);
      this.appOverviewPatcher.addPair(details.unAppID, steamAppId);
      appInfo.set(details.unAppID, { appId: details.unAppID, appName: details.strDisplayName });
    }

    this.appInfoSubject.next(appInfo);
    if (shortcutsPurgeIsNeeded) {
      logger.toast("MoonDeck cache is corrupted! Please purge all MoonDeck apps!", { output: "error" });
    }
  }

  deinit(): void {
    this.appOverviewPatcher.deinit();

    if (this.unobserveCallback !== null) {
      this.unobserveCallback();
      this.unobserveCallback = null;
    }

    this.keyMapping = null;
    this.appInfoSubject.next(new Map());
  }

  getId(steamAppId: number): number | null {
    if (this.keyMapping === null) {
      logger.error("ShortcutManager is not ready yet!");
      return null;
    }

    return this.keyMapping.get(steamAppId) ?? null;
  }

  updateAppLaunchTimestamp(steamAppId: number): void {
    const moonDeckAppId = this.getId(steamAppId);
    if (moonDeckAppId !== null) {
      this.appOverviewPatcher.tryUpdate(moonDeckAppId);
    }
  }

  async addShortcut(steamAppId: number, appName: string, execPath: string): Promise<number | null> {
    if (this.keyMapping === null) {
      logger.error("ShortcutManager is not ready yet!");
      return null;
    }

    const appId = await addShortcut(appName, execPath);
    if (appId === null) {
      return null;
    }

    this.keyMapping.set(steamAppId, appId);
    this.appOverviewPatcher.addPair(appId, steamAppId);
    this.appInfoSubject.value.set(appId, { appId, appName });
    this.appInfoSubject.next(new Map([...this.appInfoSubject.value]));
    return appId;
  }

  async removeShortcut(moondeckAppId: number, fromSteamList = true): Promise<void> {
    if (fromSteamList) {
      await removeShortcut(moondeckAppId);
    }

    if (this.keyMapping !== null) {
      this.keyMapping.deleteValue(moondeckAppId);
      this.appOverviewPatcher.removePair(moondeckAppId);
      this.appInfoSubject.value.delete(moondeckAppId);
      this.appInfoSubject.next(new Map([...this.appInfoSubject.value]));
    }
  }

  async purgeAllShortcuts(): Promise<void> {
    if (this.initializing) {
      logger.toast("Plugin is still initializing!", { output: "error" });
      return;
    }

    if (this.appSyncState.getState().syncing) {
      return;
    }

    try {
      this.appSyncState.setState(true, AppType.MoonDeck);

      const appIds = Array.from(this.appInfoSubject.value.keys());
      this.appSyncState.setMax(appIds.length);

      for (const appId of appIds) {
        await this.removeShortcut(appId);
      }

      if (appIds.length > 0) {
        restartSteamClient();
      }
    } catch (error) {
      logger.critical(error);
    } finally {
      this.appSyncState.resetState();
    }
  }

  get initializing(): boolean {
    return this.keyMapping === null;
  }
}
