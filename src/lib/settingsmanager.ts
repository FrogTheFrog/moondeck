import { cloneDeep, isEqual } from "lodash";
import { BehaviorSubject } from "rxjs";
import { Mutex } from "async-mutex";
import { ReadonlySubject } from "./readonlysubject";
import { ServerAPI } from "decky-frontend-lib";
import { logger } from "./logger";

export interface HostSettings {
  buddyPort: number;
  address: string;
  hostName: string;
  mac: string;
}

export interface GameSessionSettings {
  autoApplyAppId: boolean;
  resumeAfterSuspend: boolean;
}

export interface UserSettings {
  version: number;
  clientId: string;
  currentHostId: string | null;
  gameSession: GameSessionSettings;
  hostSettings: { [key: string]: HostSettings };
}

async function getUserSettings(serverAPI: ServerAPI): Promise<UserSettings | null> {
  try {
    const resp = await serverAPI.callPluginMethod<unknown, UserSettings | null>("get_user_settings", {});
    if (resp.success) {
      return resp.result;
    } else {
      logger.error(`Error while fetching user settings: ${resp.result}`);
    }
  } catch (message) {
    logger.critical(message);
  }
  return null;
}

async function setUserSettings(serverAPI: ServerAPI, settings: UserSettings): Promise<void> {
  try {
    const resp = await serverAPI.callPluginMethod<{ data: UserSettings }, null>("set_user_settings", { data: settings });
    if (!resp.success) {
      logger.error(`Error while setting user settings: ${resp.result}`);
    }
  } catch (message) {
    logger.critical(message);
  }
}

function cloneSettings<T>(settings: Readonly<T> | null): T | null {
  return cloneDeep(settings);
}

export class SettingsManager {
  private readonly serverAPI: ServerAPI;
  private readonly refreshMutex = new Mutex();
  private readonly setterMutex = new Mutex();
  private readonly refreshInProgressSubject = new BehaviorSubject<boolean>(false);
  private readonly settingsSubject = new BehaviorSubject<UserSettings | null>(null);

  readonly refreshInProgress = new ReadonlySubject(this.refreshInProgressSubject);
  readonly settings = new ReadonlySubject(this.settingsSubject);

  constructor(serverAPI: ServerAPI) {
    this.serverAPI = serverAPI;
  }

  get hostSettings(): Readonly<HostSettings> | null {
    if (this.settings.value === null || this.settings.value.currentHostId === null) {
      return null;
    }

    const hostSettings = this.settings.value.hostSettings[this.settings.value.currentHostId];
    if (hostSettings === undefined) {
      return null;
    }

    return hostSettings as Readonly<HostSettings>;
  }

  init(): void {
    this.refresh().catch((e) => logger.critical(e));
  }

  deinit(): void {
    this.refreshInProgressSubject.next(false);
    this.settingsSubject.next(null);
  }

  cloneSettings(): UserSettings | null {
    return cloneSettings(this.settings.value);
  }

  async refresh(): Promise<void> {
    const release = await this.refreshMutex.acquire();
    try {
      this.refreshInProgressSubject.next(true);

      const settings = await getUserSettings(this.serverAPI);

      if (!isEqual(this.settings.value, settings)) {
        this.settingsSubject.next(settings);
      }
    } finally {
      this.refreshInProgressSubject.next(false);
      release();
    }
  }

  async set(settings: UserSettings): Promise<void> {
    const release = await this.setterMutex.acquire();
    try {
      if (!isEqual(this.settings.value, settings)) {
        await setUserSettings(this.serverAPI, settings);
        await this.refresh();
      }
    } finally {
      release();
    }
  }
}
