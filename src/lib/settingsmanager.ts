import { cloneDeep, isEqual, throttle } from "lodash";
import { BehaviorSubject } from "rxjs";
import { Mutex } from "async-mutex";
import { ReadonlySubject } from "./readonlysubject";
import { ServerAPI } from "decky-frontend-lib";
import { logger } from "./logger";

export const appResolutionOverrideValues = ["CustomResolution", "DisplayResolution", "Native", "Default"] as const;
export const buttonStyles = ["HighContrast", "Clean"] as const;
export const horizontalAlignmentValues = ["top", "bottom"] as const;
export const verticalAlignmentValues = ["left", "right"] as const;
export const minBitrate = 500 as const;
export const maxBitrate = 150000 as const;

export const buddyRequestsDefault = 5 as const;
export const servicePingDefault = 5 as const;
export const initialConditionsDefault = 30 as const;
export const streamReadinessDefault = 30 as const;
export const appLaunchDefault = 30 as const;
export const appLaunchStabilityDefault = 15 as const;
export const appUpdateDefault = 15 as const;

export interface RunnerTimeouts {
  buddyRequests: number;
  servicePing: number;
  initialConditions: number;
  streamReadiness: number;
  appLaunch: number;
  appLaunchStability: number;
  appUpdate: number;
}

export interface HostApp {
  selectedAppIndex: number;
  apps: string[];
}

export interface Dimension {
  width: number;
  height: number;
  bitrate: number | null;
}

export interface HostResolution {
  automatic: boolean;
  appResolutionOverride: typeof appResolutionOverrideValues[number];
  passToBuddy: boolean;
  passToMoonlight: boolean;
  useCustomDimensions: boolean;
  selectedDimensionIndex: number;
  defaultBitrate: number | null;
  dimensions: Dimension[];
}

export interface HostSettings {
  hostInfoPort: number;
  buddyPort: number;
  address: string;
  staticAddress: boolean;
  hostName: string;
  mac: string;
  closeSteamOnceSessionEnds: boolean;
  resolution: HostResolution;
  hostApp: HostApp;
  runnerTimeouts: RunnerTimeouts;
  runnerDebugLogs: boolean;
}

export interface GameSessionSettings {
  autoApplyAppId: boolean;
  resumeAfterSuspend: boolean;
}

export interface ButtonPositionSettings {
  horizontalAlignment: typeof horizontalAlignmentValues[number];
  verticalAlignment: typeof verticalAlignmentValues[number];
  offsetX: string;
  offsetY: string;
  offsetForHltb: boolean;
}

export interface ButtonStyleSettings {
  showFocusRing: boolean;
  theme: typeof buttonStyles[number];
}

export interface UserSettings {
  version: number;
  clientId: string;
  currentHostId: string | null;
  gameSession: GameSessionSettings;
  buttonPosition: ButtonPositionSettings;
  buttonStyle: ButtonStyleSettings;
  hostSettings: { [key: string]: HostSettings };
}

export function stringifyDimension(value: Dimension): string {
  if (value.bitrate === null) {
    return `${value.width}x${value.height}`;
  }
  return `${value.width}x${value.height} (${value.bitrate} kbps)`;
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

export class SettingsManager {
  private readonly serverAPI: ServerAPI;
  private readonly refreshMutex = new Mutex();
  private readonly refreshInProgressSubject = new BehaviorSubject<boolean>(false);
  private readonly settingsSubject = new BehaviorSubject<UserSettings | null>(null);
  private readonly setUserSettingsThrottled = throttle((settings: UserSettings) => { setUserSettings(this.serverAPI, settings).catch((e) => logger.critical(e)); }, 1000);

  readonly refreshInProgress = new ReadonlySubject(this.refreshInProgressSubject);
  readonly settings = new ReadonlySubject(this.settingsSubject);

  private async refresh(): Promise<void> {
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

  private set(settings: UserSettings): void {
    if (isEqual(this.settings.value, settings)) {
      return;
    }

    this.settingsSubject.next(settings);
    this.setUserSettingsThrottled(settings);
  }

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
    this.setUserSettingsThrottled.flush();
    this.refreshInProgressSubject.next(false);
    this.settingsSubject.next(null);
  }

  update(callback: (settings: UserSettings) => void): void {
    if (this.settings.value === null) {
      logger.error("Settings are not ready to be updated yet");
      return;
    }

    const settings = cloneDeep(this.settings.value);
    callback(settings);
    this.set(settings);
  }

  updateHost(callback: (settings: HostSettings) => void): void {
    if (this.settings.value === null) {
      logger.error("Settings are not ready to be updated yet");
      return;
    }

    if (this.settings.value.currentHostId === null) {
      logger.error("Host is not selected and thus cannot be updated");
      return;
    }

    const settings = cloneDeep(this.settings.value);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const hostSettings = settings.hostSettings[settings.currentHostId!];
    if (hostSettings === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      logger.error(`Host (${settings.currentHostId!}) settings are missing!`);
      return;
    }

    callback(hostSettings);
    this.set(settings);
  }
}
