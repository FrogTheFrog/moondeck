import { AppType, EnvVars, addShortcut, getAppStoreEx, removeShortcut as removeSteamShortcut, setAppHiddenState, setAppLaunchOptions } from "./steamutils";
import { getEnvKeyValueNumber, getEnvKeyValueString, makeEnvKeyValue } from "./envutils";
import { AppDetails } from "@decky/ui/dist/globals/steam-client/App";
import { AppOverviewPatcher } from "./appoverviewpatcher";
import BiMap from "ts-bidirectional-map";
import { logger } from "./logger";

function makeLaunchOptions(sourceAppId: number, targetName: string): string {
  return [
    makeEnvKeyValue(EnvVars.AppType, AppType.GameStream),
    makeEnvKeyValue(EnvVars.AppName, targetName),
    makeEnvKeyValue(EnvVars.LinkedSourceAppId, sourceAppId),
    "%command%"
  ].join(" ");
}

export interface LinkedAppShortcutInfo {
  sourceAppId: number;
  helperAppId: number;
  sourceName: string;
  targetName: string;
}

export class LinkedAppShortcuts {
  private unobserveCallback: (() => void) | null = null;
  private keyMapping: BiMap<number, number> | null = null;
  private sourceNames = new Map<number, string>();
  private targetNames = new Map<number, string>();
  private readonly appOverviewPatcher = new AppOverviewPatcher({
    rt_last_time_locally_played: (currentValue, newValue) =>
      typeof currentValue !== "number" ||
      (typeof newValue === "number" && newValue > currentValue)
  });

  private removeCachedHelper(helperAppId: number): void {
    if (this.keyMapping === null) {
      return;
    }

    let sourceAppId: number | null = null;
    for (const candidate of this.targetNames.keys()) {
      if (this.keyMapping.get(candidate) === helperAppId) {
        sourceAppId = candidate;
        break;
      }
    }

    this.keyMapping.deleteValue(helperAppId);
    this.appOverviewPatcher.removePair(helperAppId);

    if (sourceAppId !== null) {
      this.targetNames.delete(sourceAppId);
    }
  }

  private initAppStoreObservable(): void {
    const appStoreEx = getAppStoreEx();
    if (appStoreEx === null) {
      logger.error("appStoreEx is null!");
      return;
    }

    this.unobserveCallback = appStoreEx.observe((change) => {
      if (change.type !== "delete" || this.keyMapping?.hasValue(change.name) !== true) {
        return;
      }

      this.removeCachedHelper(change.name);
    });
  }

  init(allDetails: AppDetails[]): void {
    this.initAppStoreObservable();
    this.appOverviewPatcher.init();
    this.keyMapping = new BiMap();
    this.sourceNames = new Map(allDetails.map((details) => [details.unAppID, details.strDisplayName]));
    this.targetNames.clear();

    for (const details of allDetails) {
      if (!details.strLaunchOptions.includes(
        makeEnvKeyValue(EnvVars.AppType, AppType.GameStream)
      )) {
        continue;
      }

      const sourceAppId = getEnvKeyValueNumber(
        details.strLaunchOptions,
        EnvVars.LinkedSourceAppId
      );
      if (sourceAppId === null) {
        continue;
      }

      const targetName = getEnvKeyValueString(
        details.strLaunchOptions,
        EnvVars.AppName
      );
      if (targetName === null) {
        logger.error("Linked shortcut is missing its host app name!");
        continue;
      }

      if (this.keyMapping.get(sourceAppId) !== undefined) {
        logger.error("Duplicate linked shortcut for source app!");
        continue;
      }

      this.keyMapping.set(sourceAppId, details.unAppID);
      this.targetNames.set(sourceAppId, targetName);
      this.appOverviewPatcher.addPair(details.unAppID, sourceAppId);
    }
  }

  deinit(): void {
    this.appOverviewPatcher.deinit();

    if (this.unobserveCallback !== null) {
      this.unobserveCallback();
      this.unobserveCallback = null;
    }

    this.keyMapping = null;
    this.sourceNames.clear();
    this.targetNames.clear();
  }

  getId(sourceAppId: number): number | null {
    if (this.keyMapping === null) {
      logger.error("Linked shortcut manager is not ready yet!");
      return null;
    }

    return this.keyMapping.get(sourceAppId) ?? null;
  }

  getSourceName(sourceAppId: number): string | null {
    return this.sourceNames.get(sourceAppId) ?? null;
  }

  getEntries(): LinkedAppShortcutInfo[] {
    if (this.keyMapping === null) {
      return [];
    }

    const entries: LinkedAppShortcutInfo[] = [];

    for (const [sourceAppId, targetName] of this.targetNames.entries()) {
      const helperAppId = this.keyMapping.get(sourceAppId);
      if (helperAppId === undefined) {
        continue;
      }

      entries.push({
        sourceAppId,
        helperAppId,
        sourceName: this.getSourceName(sourceAppId) ?? "Non-Steam shortcut",
        targetName
      });
    }

    return entries;
  }

  updateAppLaunchTimestamp(sourceAppId: number): void {
    const helperAppId = this.getId(sourceAppId);
    if (helperAppId !== null) {
      this.appOverviewPatcher.tryUpdate(helperAppId);
    }
  }

  async updateGameStreamShortcut(sourceAppId: number, targetName: string): Promise<boolean> {
    if (this.keyMapping === null) {
      logger.error("Linked shortcut manager is not ready yet!");
      return false;
    }

    const helperAppId = this.keyMapping.get(sourceAppId);
    if (helperAppId === undefined) {
      logger.error("Linked shortcut does not exist for source app!");
      return false;
    }

    if (!await setAppLaunchOptions(
      helperAppId,
      makeLaunchOptions(sourceAppId, targetName)
    )) {
      return false;
    }

    this.targetNames.set(sourceAppId, targetName);
    return true;
  }

  async addGameStreamShortcut(
    sourceAppId: number,
    sourceName: string,
    targetName: string,
    execPath: string
  ): Promise<number | null> {
    if (this.keyMapping === null) {
      logger.error("Linked shortcut manager is not ready yet!");
      return null;
    }

    if (this.keyMapping.get(sourceAppId) !== undefined) {
      logger.error("A linked shortcut already exists for the source app!");
      return null;
    }

    const helperAppId = await addShortcut(sourceName, execPath);
    if (helperAppId === null) {
      logger.error("Failed to create linked shortcut!");
      return null;
    }

    if (!await setAppLaunchOptions(
      helperAppId,
      makeLaunchOptions(sourceAppId, targetName)
    )) {
      logger.error("Failed to configure linked shortcut!");
      await removeSteamShortcut(helperAppId);
      return null;
    }

    if (!await setAppHiddenState(helperAppId, true)) {
      logger.error("Failed to hide linked shortcut!");
      await removeSteamShortcut(helperAppId);
      return null;
    }

    this.keyMapping.set(sourceAppId, helperAppId);
    this.sourceNames.set(sourceAppId, sourceName);
    this.targetNames.set(sourceAppId, targetName);
    this.appOverviewPatcher.addPair(helperAppId, sourceAppId);
    return helperAppId;
  }

  async removeShortcut(helperAppId: number, fromSteamList = true): Promise<boolean> {
    if (fromSteamList && !await removeSteamShortcut(helperAppId)) {
      return false;
    }

    this.removeCachedHelper(helperAppId);
    return true;
  }

  get initializing(): boolean {
    return this.keyMapping === null;
  }
}
