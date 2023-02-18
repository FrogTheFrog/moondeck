import { addShortcut, getAllMoonDeckAppDetails, getAppIdFromShortcut, getAppStore, removeShortcut, restartSteamClient } from "./steamutils";
import { AppDetailsPatcher } from "./appdetailspatcher";
import { BehaviorSubject } from "rxjs";
import BiMap from "ts-bidirectional-map";
import { ReadonlySubject } from "./readonlysubject";
import { logger } from "./logger";

export class ShortcutManager {
  private unobserveCallback: (() => void) | null = null;
  private keyMapping: BiMap<number, number> | null = null;
  private moondeckPurge = false;
  private readonly readyStateSubject = new BehaviorSubject<boolean>(false);
  private readonly appDetailsPatcher = new AppDetailsPatcher({
    rt_last_time_locally_played: (currentValue, newValue) => typeof currentValue !== "number" || (typeof newValue === "number" && newValue > currentValue)
  });

  readonly readyState = new ReadonlySubject(this.readyStateSubject);

  private updateReadyState(): void {
    const newState = (this.keyMapping !== null && !this.moondeckPurge);
    if (this.readyStateSubject.value !== newState) {
      this.readyStateSubject.next(newState);
    }
  }

  private initAppStoreObservable(): void {
    const appStore = getAppStore();
    if (appStore === null) {
      logger.error("appStore is null!");
      return;
    }

    this.unobserveCallback = appStore.m_mapApps.observe((details) => {
      if (details.type !== "delete") {
        return;
      }

      if (this.keyMapping?.hasValue(details.name) === false ?? false) {
        return;
      }

      this.removeShortcut(details.name, false).catch((e) => logger.critical(e));
    });
  }

  async init(): Promise<void> {
    this.initAppStoreObservable();
    this.appDetailsPatcher.init();
    this.keyMapping = new BiMap();

    let shortcutsRemoved = false;
    const details = await getAllMoonDeckAppDetails();
    for (const detail of details) {
      const steamAppId = getAppIdFromShortcut(detail.strLaunchOptions);
      if (steamAppId === null || steamAppId in this.keyMapping) {
        shortcutsRemoved = true;
        await this.removeShortcut(detail.unAppID);
        continue;
      }

      this.keyMapping.set(steamAppId, detail.unAppID);
      this.appDetailsPatcher.addPair(detail.unAppID, steamAppId);
    }

    this.updateReadyState();
    if (shortcutsRemoved) {
      logger.toast("Shortcuts were removed! Restart Steam Client!", { output: "error" });
    }
  }

  deinit(): void {
    this.appDetailsPatcher.deinit();

    if (this.unobserveCallback !== null) {
      this.unobserveCallback();
      this.unobserveCallback = null;
    }

    this.keyMapping = null;
    this.updateReadyState();
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
      this.appDetailsPatcher.tryUpdate(moonDeckAppId);
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
    this.appDetailsPatcher.addPair(appId, steamAppId);
    return appId;
  }

  async removeShortcut(moondeckAppId: number, fromSteamList = true): Promise<void> {
    if (fromSteamList) {
      await removeShortcut(moondeckAppId);
    }

    if (this.keyMapping !== null) {
      this.keyMapping.deleteValue(moondeckAppId);
      this.appDetailsPatcher.removePair(moondeckAppId);
    }
  }

  async purgeAllShortcuts(): Promise<void> {
    if (this.moondeckPurge) {
      return;
    }

    this.moondeckPurge = true;
    this.updateReadyState();

    const details = await getAllMoonDeckAppDetails();
    for (const detail of details) {
      await this.removeShortcut(detail.unAppID);
    }

    this.moondeckPurge = false;
    this.updateReadyState();

    if (details.length > 0) {
      restartSteamClient();
    }
  }
}
