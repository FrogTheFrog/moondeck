import { AppDetails, ServerAPI } from "decky-frontend-lib";
import { Dimension, HostResolution, HostSettings, SettingsManager } from "./settingsmanager";
import { E_ALREADY_LOCKED, Mutex, tryAcquire } from "async-mutex";
import { Subscription, pairwise } from "rxjs";
import { getAppDetails, getCurrentDisplayModeString, getDisplayIdentifiers, getMoonDeckAppIdMark, getMoonDeckLinkedDisplayMark, getMoonDeckResMark, getSystemNetworkStore, launchApp, registerForGameLifetime, registerForSuspendNotifictions, setAppHiddenState, setAppLaunchOptions, setAppResolutionOverride, setShortcutName, waitForNetworkConnection } from "./steamutils";
import { CommandProxy } from "./commandproxy";
import { MoonDeckAppProxy } from "./moondeckapp";
import { ShortcutManager } from "./shortcutmanager";
import { logger } from "./logger";

async function getMoonDeckRunPath(serverAPI: ServerAPI): Promise<string | null> {
  try {
    const resp = await serverAPI.callPluginMethod<unknown, string>("get_moondeckrun_path", {});
    if (resp.success) {
      return resp.result;
    } else {
      logger.error(`Error while getting moondeckrun.sh path: ${resp.result}`);
    }
  } catch (message) {
    logger.critical(message);
  }

  return null;
}

function getCustomDimension(display: string | null, hostResolution: Readonly<HostResolution>): string | null {
  const dimensions = hostResolution.dimensions;
  const stringify = (dimension: Dimension): string => { return `${dimension.width}x${dimension.height}`; };

  if (display !== null) {
    for (const dimension of dimensions) {
      if (dimension.linkedDisplays.includes(display)) {
        return stringify(dimension);
      }
    }
  }
  if (hostResolution.useCustomDimensions) {
    const index = hostResolution.selectedDimensionIndex;
    if (index >= 0 && index < dimensions.length) {
      const dimension = dimensions[index];
      return stringify(dimension);
    }
    logger.error("Dimension index out of range!");
  }
  return null;
}

function getSelectedAppResolution(mode: string | null, display: string | null, hostSettings: Readonly<HostSettings>): string {
  const customDimension = getCustomDimension(display, hostSettings.resolution);
  switch (hostSettings.resolution.appResolutionOverride) {
    case "CustomResolution":
      if (customDimension) {
        return customDimension;
      }
    // fallthrough
    case "DisplayResolution":
      if (mode) {
        return mode;
      }
    // fallthrough
    case "Native":
      return "Native";
    default:
      return "Default";
  }
}

export class MoonDeckAppLauncher {
  private unregisterLifetime: (() => void) | null = null;
  private unregisterSuspension: (() => void) | null = null;
  private moonDeckRunPath: string | null = null;
  private subscription: Subscription | null = null;
  private readonly launchMutex = new Mutex();
  readonly moonDeckApp: MoonDeckAppProxy;

  private async ensureAppDetails(steamAppId: number, execPath: string, appName: string): Promise<AppDetails | null> {
    let appId = this.shortcutManager.getId(steamAppId);
    let details = appId === null ? null : await getAppDetails(appId);

    // Probably the cache is outdated
    if (details === null && appId !== null) {
      await this.shortcutManager.removeShortcut(appId);
      appId = null;
    }

    if (appId === null) {
      appId = await this.shortcutManager.addShortcut(steamAppId, appName, execPath);
      if (appId === null) {
        return null;
      }
    }

    if (!await setAppHiddenState(appId, true)) {
      logger.error(`Failed to hide app ${appId}!`);
      await this.shortcutManager.removeShortcut(appId);
      return null;
    }

    details = await getAppDetails(appId);
    if (details === null) {
      logger.error(`Failed to get app details for ${appId}!`);
    }

    return details;
  }

  private initLifetime(): void {
    this.unregisterLifetime = registerForGameLifetime((data) => {
      if (data.bRunning) {
        return;
      }

      Promise.resolve().then(async () => {
        if (this.moonDeckApp.value === null || await this.moonDeckApp.isStillRunning()) {
          // Some other app was terminated
          return;
        }

        const result = await this.moonDeckApp.getRunnerResult();
        if (result !== null && !this.moonDeckApp.value.beingSuspended && !this.moonDeckApp.value.beingKilled) {
          logger.toast(result, { output: "warn" });
        }

        if (!this.moonDeckApp.value.beingSuspended) {
          await this.moonDeckApp.clearApp();
        }
      }).catch((e) => logger.critical(e));
    });
  }

  private initSuspension(): void {
    this.unregisterSuspension = registerForSuspendNotifictions((info) => {
      // This the earliest state or smt
      if (info.state === 1 && this.moonDeckApp.value !== null) {
        this.moonDeckApp.suspendApp().catch((e) => logger.critical(e));
      }
    }, (info) => {
      // This the latest state or smt
      if (info.state === 1) {
        const resumeAfterSuspend = this.settingsManager.settings.value?.gameSession.resumeAfterSuspend ?? false;
        if (!resumeAfterSuspend) {
          this.moonDeckApp.clearApp().catch((e) => logger.critical(e));
          return;
        }

        waitForNetworkConnection().then((result) => {
          if (this.moonDeckApp.value === null) {
            return;
          }

          if (result) {
            logger.log(`Relaunching app ${this.moonDeckApp.value.steamAppId} after suspend.`);
            this.launchApp(this.moonDeckApp.value.steamAppId, this.moonDeckApp.value.name).catch((e) => logger.critical(e));
          } else {
            logger.toast("Not resuming session - no network connection!", { output: "warn" });
            this.moonDeckApp.clearApp().catch((e) => logger.critical(e));
          }
        }).catch((e) => logger.critical(e));
      }
    });
  }

  private initMoonDeckAppTimestampUpdater(): void {
    this.subscription = new Subscription();
    this.subscription.add(this.moonDeckApp.asObservable().pipe(pairwise()).subscribe(([prev, next]) => {
      if (prev !== null && next === null) {
        this.shortcutManager.updateAppLaunchTimestamp(prev.steamAppId);
      }
    }));
  }

  private async getMoonDeckRunPath(): Promise<string | null> {
    if (this.moonDeckRunPath === null) {
      this.moonDeckRunPath = await getMoonDeckRunPath(this.serverAPI);
    }

    return this.moonDeckRunPath;
  }

  constructor(
    private readonly serverAPI: ServerAPI,
    private readonly settingsManager: SettingsManager,
    private readonly shortcutManager: ShortcutManager,
    commandProxy: CommandProxy
  ) {
    this.moonDeckApp = new MoonDeckAppProxy(serverAPI, commandProxy);
  }

  init(): void {
    this.initLifetime();
    this.initSuspension();
    this.initMoonDeckAppTimestampUpdater();
  }

  deinit(): void {
    if (this.unregisterLifetime !== null) {
      this.unregisterLifetime();
      this.unregisterLifetime = null;
    }
    if (this.unregisterSuspension !== null) {
      this.unregisterSuspension();
      this.unregisterSuspension = null;
    }
    if (this.subscription !== null) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }

  async launchApp(appId: number, appName: string): Promise<void> {
    if (!this.shortcutManager.readyState.value) {
      logger.toast("Plugin is still initializing...");
      return;
    }

    const settings = this.settingsManager.settings.value?.gameSession ?? null;
    if (settings === null) {
      logger.toast("Settings are not available!", { output: "error" });
      return;
    }

    const hostSettings = this.settingsManager.hostSettings;
    if (hostSettings === null) {
      logger.toast("Host is not selected!");
      return;
    }

    if (await this.moonDeckApp.isStillRunning()) {
      logger.toast("Some MoonDeck app is already running!");
      return;
    }

    const hasNetworkConnection = getSystemNetworkStore()?.hasNetworkConnection ?? false;
    if (!hasNetworkConnection) {
      logger.toast("No network connection!");
      return;
    }

    try {
      tryAcquire(this.launchMutex);
      try {
        logger.log(`Preparing to launch ${appName}.`);

        const execPath = await this.getMoonDeckRunPath();
        if (execPath === null) {
          logger.toast("Failed to get moondeckrun.sh path!", { output: "error" });
          return;
        }

        const details = await this.ensureAppDetails(appId, execPath, appName);
        if (details === null) {
          logger.toast("Failed to create shortcut (needs restart?)!", { output: "error" });
          return;
        }

        if (!await setShortcutName(details.unAppID, appName)) {
          logger.toast("Failed to update shortcut name (needs restart?)!", { output: "error" });
          return;
        }

        let currentDisplay: string | null = null;
        if (hostSettings.resolution.useLinkedDisplays) {
          const displays = await getDisplayIdentifiers();
          if (displays === null) {
            logger.toast("Failed to get display info from Steam!", { output: "error" });
          }
          currentDisplay = displays?.current ?? null;
        }

        const mode = await getCurrentDisplayModeString();
        if (!await setAppResolutionOverride(details.unAppID, getSelectedAppResolution(mode, currentDisplay, hostSettings))) {
          logger.toast("Failed to set app resolution override (needs restart?)!", { output: "error" });
          return;
        }

        const launchOptions = `${getMoonDeckAppIdMark(appId)}${getMoonDeckResMark(mode, hostSettings.resolution.automatic)}${getMoonDeckLinkedDisplayMark(currentDisplay)} %command%`;
        if (!await setAppLaunchOptions(details.unAppID, launchOptions)) {
          logger.toast("Failed to update shortcut launch options (needs restart?)!", { output: "error" });
          return;
        }

        let sessionOptions = this.moonDeckApp.value?.sessionOptions ?? null;
        if (sessionOptions === null) {
          sessionOptions = {
            nameSetToAppId: settings.autoApplyAppId
          };
        }

        this.moonDeckApp.setApp(appId, details.unAppID, appName, sessionOptions);
        await this.moonDeckApp.clearRunnerResult();
        if (!await launchApp(details.unAppID, 5000)) {
          logger.toast("Failed to launch shortcut!", { output: "error" });
          await this.moonDeckApp.killApp();
          await this.moonDeckApp.clearApp();
          return;
        }

        await this.moonDeckApp.applySessionOptions();
      } catch (error) {
        logger.toast("Exception while trying to launch shortcut!", { output: null });
        logger.critical(error);
      } finally {
        this.launchMutex.release();
      }
    } catch (error) {
      if (error !== E_ALREADY_LOCKED) {
        logger.toast("Exception while trying to launch shortcut!", { output: null });
        logger.critical(error);
      }
    }
  }
}
