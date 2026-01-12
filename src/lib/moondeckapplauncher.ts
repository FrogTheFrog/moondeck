import { AppStartResult, AppType, ControllerConfigOption, EnvVars, checkExecPathMatch, getAppDetails, getAudioDevices, getCurrentDisplayModeString, getDisplayIdentifiers, getMoonDeckRunPath, getSystemNetworkStore, launchApp, registerForGameLaunchIntercept, registerForGameLifetime, registerForSuspendNotifictions, setAppHiddenState, setAppLaunchOptions, setAppResolutionOverride, setOverrideResolutionForInternalDisplay, setShortcutName, waitForNetworkConnection } from "./steamutils";
import { ControllerConfigValues, Dimension, HostResolution, HostSettings, SettingsManager, networkReconnectAfterSuspendDefault } from "./settingsmanager";
import { Subscription, pairwise } from "rxjs";
import { getEnvKeyValueString, makeEnvKeyValue } from "./envutils";
import { AppDetails } from "@decky/ui/dist/globals/steam-client/App";
import { AppSyncState } from "./appsyncstate";
import { CommandProxy } from "./commandproxy";
import { ESuspendResumeProgressState } from "@decky/ui/dist/globals/steam-client/User";
import { EThirdPartyControllerConfiguration } from "@decky/ui/dist/globals/steam-client/Input";
import { ExternalAppShortcuts } from "./externalappshortcuts";
import { MoonDeckAppProxy } from "./moondeckapp";
import { MoonDeckAppShortcuts } from "./moondeckappshortcuts";
import { call } from "@decky/api";
import { logger } from "./logger";

async function setRunnerReady(): Promise<void> {
  try {
    await call("set_runner_ready");
  } catch (message) {
    logger.critical("Error while setting runner ready state: ", message);
  }
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

function getLaunchOptionsString(currentValue: string, appId: number, appType: AppType, displayMode: string | null, autoResolution: boolean, currentAudioDevice: string | null, currentDisplay: string | null, pythonExecPath: string): string | null {
  const launchOptions: string[] = [];
  launchOptions.push(makeEnvKeyValue(EnvVars.AppType, appType));

  if (appType === AppType.MoonDeck) {
    launchOptions.push(makeEnvKeyValue(EnvVars.SteamAppId, appId));
  } else if (appType === AppType.GameStream) {
    const appNameFromOptions = getEnvKeyValueString(currentValue, EnvVars.AppName);
    if (appNameFromOptions === null) {
      logger.error(`Failed to get app name from launch options for ${appId}!`);
      return null;
    }

    launchOptions.push(makeEnvKeyValue(EnvVars.AppName, appNameFromOptions));
  } else {
    const appIdFromOptions = getEnvKeyValueString(currentValue, EnvVars.SteamAppId);
    if (appIdFromOptions === null) {
      logger.error(`Failed to get app id from launch options for ${appId}!`);
      return null;
    }

    launchOptions.push(makeEnvKeyValue(EnvVars.SteamAppId, appIdFromOptions));
  }

  if (autoResolution && displayMode !== null) {
    launchOptions.push(makeEnvKeyValue(EnvVars.AutoResolution, displayMode));
  }

  if (currentAudioDevice !== null) {
    launchOptions.push(makeEnvKeyValue(EnvVars.LinkedAudio, currentAudioDevice));
  }

  if (currentDisplay !== null) {
    launchOptions.push(makeEnvKeyValue(EnvVars.LinkedDisplay, currentDisplay));
  }

  if (pythonExecPath.length > 0) {
    launchOptions.push(makeEnvKeyValue(EnvVars.Python, pythonExecPath));
  }

  launchOptions.push("%command%");
  return launchOptions.join(" ");
}

export function updateControllerConfig(appId: number, controllerConfig: keyof typeof ControllerConfigValues | null): void {
  if (controllerConfig !== null) {
    logger.log(`Setting controller config to ${controllerConfig} for ${appId}.`);
    const option = ControllerConfigOption[controllerConfig] as unknown as EThirdPartyControllerConfiguration;
    SteamClient.Apps.SetThirdPartyControllerConfiguration(appId, option);
  }
}

export class MoonDeckAppLauncher {
  private unregisterLifetime: (() => void) | null = null;
  private unregisterSuspension: (() => void) | null = null;
  private unregisterInterceptor: (() => void) | null = null;
  private interceptedLaunch = false;
  private subscription: Subscription | null = null;
  readonly moonDeckApp: MoonDeckAppProxy;

  private async ensureAppDetails(steamAppId: number, execPath: string, appName: string, appType: AppType): Promise<AppDetails | null> {
    let appId: number | null = null;
    let details: AppDetails | null = null;

    if (appType === AppType.MoonDeck) {
      appId = this.moonDeckAppShortcuts.getId(steamAppId);
      details = appId === null ? null : await getAppDetails(appId);

      // Probably the cache is outdated
      if (details === null && appId !== null) {
        await this.moonDeckAppShortcuts.removeShortcut(appId);
        appId = null;
      }

      if (appId === null) {
        appId = await this.moonDeckAppShortcuts.addShortcut(steamAppId, appName, execPath);
        if (appId === null) {
          return null;
        }
      }

      if (!await setAppHiddenState(appId, true)) {
        logger.error(`Failed to hide app ${appId}!`);
        await this.moonDeckAppShortcuts.removeShortcut(appId);
        return null;
      }
    } else {
      appId = steamAppId;
    }

    details = await getAppDetails(appId);
    if (details === null) {
      logger.error(`Failed to get app details for ${appId}!`);
      return null;
    }

    if (!checkExecPathMatch(execPath, details.strShortcutExe)) {
      logger.error(`Exec path does not match the expected one for ${appId}! ${details.strShortcutExe} vs ${execPath}`);
      return null;
    }

    return details;
  }

  private initLifetime(): void {
    this.unregisterLifetime = registerForGameLifetime((data) => {
      if (data.bRunning) {
        return;
      }

      Promise.resolve().then(async () => {
        if (this.moonDeckApp.value === null) {
          // There should be no result in this state, unless the plugin is still loading app details
          // and did not manage to intercept calls OR some error has occured somewhere...
          const result = await this.moonDeckApp.getRunnerResult();
          if (result !== null) {
            logger.toast(result, { output: "warn" });
          }
          return;
        }

        if (await this.moonDeckApp.isStillRunning()) {
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
    this.unregisterSuspension = registerForSuspendNotifictions(async (info) => {
      if (info.state === ESuspendResumeProgressState.Complete && this.moonDeckApp.value !== null) {
        logger.log("Suspending MoonDeck app.");
        await this.moonDeckApp.suspendApp();
      }
    }, async (info) => {
      if (info.state === ESuspendResumeProgressState.Complete) {
        const resumeAfterSuspend = this.settingsManager.settings.value?.gameSession.resumeAfterSuspend ?? false;
        if (!resumeAfterSuspend) {
          await this.moonDeckApp.clearApp();
          return;
        }

        logger.log("Waiting for internet connection to resume MoonDeck app.");
        const connection = await waitForNetworkConnection(this.settingsManager.hostSettings?.runnerTimeouts.networkReconnectAfterSuspend ?? networkReconnectAfterSuspendDefault);

        if (this.moonDeckApp.value === null) {
          logger.log("MoonDeck app has been started manually already.");
          return;
        }

        if (connection) {
          logger.log(`Relaunching app ${this.moonDeckApp.value.steamAppId} after suspend.`);
          await this.launchApp(this.moonDeckApp.value.steamAppId, this.moonDeckApp.value.name, this.moonDeckApp.value.appType, true);
        } else {
          logger.toast("Not resuming session - no network connection!", { output: "warn" });
          await this.moonDeckApp.clearApp();
        }
      }
    });
  }

  private initMoonDeckAppTimestampUpdater(): void {
    this.subscription = new Subscription();
    this.subscription.add(this.moonDeckApp.asObservable().pipe(pairwise()).subscribe(([prev, next]) => {
      if (prev !== null && next === null) {
        this.moonDeckAppShortcuts.updateAppLaunchTimestamp(prev.steamAppId);
      }
    }));
  }

  private initInterceptor(): void {
    this.unregisterInterceptor = registerForGameLaunchIntercept((gameId, cancel) => {
      const entry = this.externalAppShortcuts.getEntryByGameId(gameId);
      if (entry !== null) {
        if (this.moonDeckApp.value !== null) {
          if (this.moonDeckApp.value.steamAppId !== entry.appId || !this.moonDeckApp.canRedirect()) {
            cancel();
          }
        } else if (this.interceptedLaunch) {
          // To account of user clicking the button insanely fast again...
          cancel();
        } else {
          cancel();
          this.interceptedLaunch = true;
          this.launchApp(entry.appId, entry.appName, entry.appType)
            .catch((err) => logger.critical(err))
            .finally(() => { this.interceptedLaunch = false; });
        }
      }
    });
  }

  constructor(
    private readonly appSyncState: AppSyncState,
    private readonly settingsManager: SettingsManager,
    private readonly moonDeckAppShortcuts: MoonDeckAppShortcuts,
    private readonly externalAppShortcuts: ExternalAppShortcuts,
    commandProxy: CommandProxy
  ) {
    this.moonDeckApp = new MoonDeckAppProxy(commandProxy);
  }

  init(): void {
    this.initLifetime();
    this.initSuspension();
    this.initMoonDeckAppTimestampUpdater();
    this.initInterceptor();
  }

  deinit(): void {
    if (this.unregisterInterceptor !== null) {
      this.unregisterInterceptor();
      this.unregisterInterceptor = null;
    }
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

  async launchApp(appId: number, appName: string, appType: AppType, afterSuspend = false): Promise<void> {
    if (this.moonDeckAppShortcuts.initializing || this.externalAppShortcuts.initializing) {
      logger.toast("Plugin is still initializing...");
      return;
    }

    // Now that nothing is initializing anymore, we can tell the runner script to go into the "ready" state
    await setRunnerReady();

    const settings = this.settingsManager.settings.value;
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

    if (this.appSyncState.getState().syncing) {
      logger.toast("Currently syncing syncing/purging apps!");
      return;
    }

    try {
      this.appSyncState.setState(false, AppType.MoonDeck);
      this.appSyncState.setMax(1);
      this.appSyncState.incrementCount();

      logger.log(`Preparing to launch ${appName}.`);

      const execPath = await getMoonDeckRunPath();
      if (execPath === null) {
        logger.toast("Failed to get moondeckrun.sh path!", { output: "error" });
        return;
      }

      const details = await this.ensureAppDetails(appId, execPath, appName, appType);
      if (details === null) {
        logger.toast("Failed to create shortcut (needs restart?)!", { output: "error" });
        return;
      }

      if (!await setShortcutName(details.unAppID, appName)) {
        logger.toast("Failed to update shortcut name (needs restart?)!", { output: "error" });
        return;
      }

      let currentAudioDevice: string | null = null;
      if (hostSettings.audio.useLinkedAudio) {
        const devices = await getAudioDevices();
        if (devices === null) {
          logger.toast("Failed to get audio device info from Steam!", { output: "error" });
        }
        currentAudioDevice = devices?.activeOutputDevice;
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

      if (!await setOverrideResolutionForInternalDisplay(details.unAppID, hostSettings.resolution.appResolutionOverrideForInternalDisplay)) {
        logger.toast("Failed to set app resolution override for internal display (needs restart?)!", { output: "error" });
        return;
      }

      const launchOptions = getLaunchOptionsString(details.strLaunchOptions, appId, appType, mode, hostSettings.resolution.automatic, currentAudioDevice, currentDisplay, settings.pythonExecPath);
      if (launchOptions === null || !await setAppLaunchOptions(details.unAppID, launchOptions)) {
        logger.toast("Failed to update shortcut launch options (needs restart?)!", { output: "error" });
        return;
      }

      updateControllerConfig(details.unAppID, settings.gameSession.controllerConfig);

      let sessionOptions = this.moonDeckApp.value?.sessionOptions ?? null;
      if (sessionOptions === null) {
        sessionOptions = {
          nameSetToAppId: settings.gameSession.autoApplyAppId
        };
      }

      this.moonDeckApp.setApp(appId, details.unAppID, appName, appType, sessionOptions);
      await this.moonDeckApp.clearRunnerResult();

      const launchTimeout = afterSuspend ? hostSettings.runnerTimeouts.steamLaunchAfterSuspend : hostSettings.runnerTimeouts.steamLaunch;
      const launchResult = await launchApp(details.unAppID, launchTimeout * 1000);
      if (launchResult !== AppStartResult.Started) {
        if (launchResult === AppStartResult.TimeoutOrError) {
          logger.toast("Failed to launch shortcut!", { output: "error" });
          await this.moonDeckApp.killApp();
        }
        await this.moonDeckApp.clearApp();
        return;
      }

      await this.moonDeckApp.applySessionOptions();
    } catch (error) {
      logger.toast("Exception while trying to launch shortcut!", { output: null });
      logger.critical(error);
    } finally {
      this.appSyncState.resetState();
    }
  }
}
