import { addShortcut, getAllMoonDeckAppDetails, getAppIdFromShortcut, getAppStoreEx, removeShortcut, restartSteamClient } from "./steamutils";
import { AppOverviewPatcher } from "./appoverviewpatcher";
import { BehaviorSubject } from "rxjs";
import BiMap from "ts-bidirectional-map";
import { ReadonlySubject } from "./readonlysubject";
import { logger } from "./logger";

export class ShortcutManager {
  private unobserveCallback: (() => void) | null = null;
  private keyMapping: BiMap<number, number> | null = null;
  private moondeckPurge = false;
  private readonly readyStateSubject = new BehaviorSubject<boolean>(false);
  private readonly appOverviewPatcher = new AppOverviewPatcher({
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
    const appStoreEx = getAppStoreEx();
    if (appStoreEx === null) {
      logger.error("appStoreEx is null!");
      return;
    }

    this.unobserveCallback = appStoreEx.observe((change) => {
      if (change.type !== "delete") {
        return;
      }

      if (this.keyMapping?.hasValue(change.name) === false ?? false) {
        return;
      }

      this.removeShortcut(change.name, false).catch((e) => logger.critical(e));
    });
  }

  async init(): Promise<void> {
    this.initAppStoreObservable();
    this.appOverviewPatcher.init();
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
      this.appOverviewPatcher.addPair(detail.unAppID, steamAppId);
    }

    this.updateReadyState();
    if (shortcutsRemoved) {
      logger.toast("Shortcuts were removed! Restart Steam Client!", { output: "error" });
    }
  }

  deinit(): void {
    this.appOverviewPatcher.deinit();

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
    return appId;
  }

  async removeShortcut(moondeckAppId: number, fromSteamList = true): Promise<void> {
    if (fromSteamList) {
      await removeShortcut(moondeckAppId);
    }

    if (this.keyMapping !== null) {
      this.keyMapping.deleteValue(moondeckAppId);
      this.appOverviewPatcher.removePair(moondeckAppId);
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
