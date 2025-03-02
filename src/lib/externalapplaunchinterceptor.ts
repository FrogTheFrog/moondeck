import { AppType, EnvVars, getAllGameStreamAppDetails, getAppStoreEx, registerForGameLaunchIntercept } from "./steamutils";
import { AppDetails } from "@decky/ui";
import { MoonDeckAppLauncher } from "./moondeckapplauncher";
import { logger } from "./logger";
import { makeEnvKeyValue } from "./envutils";

export class ExternalAppLaunchInterceptor {
  private unobserveCallback: (() => void) | null = null;
  private unregisterCallback: (() => void) | null = null;
  private launchingApp = false;
  private readonly managedApps: Map<number, { appId: number; appName: string; appType: AppType; gameId: string }> = new Map();

  private processAppDetails(details: AppDetails | null): boolean {
    if (details) {
      const appStoreEx = getAppStoreEx();
      if (appStoreEx === null) {
        logger.error(`Could not get app store overview for ${details.unAppID} - appStoreEx is null!`);
        return false;
      }

      const overview = appStoreEx.getAppOverview(details.unAppID);
      if (overview === null) {
        return false;
      }

      if (details.strLaunchOptions.includes(makeEnvKeyValue(EnvVars.AppType, AppType.GameStream))) {
        this.managedApps.set(details.unAppID, { appId: details.unAppID, appName: details.strDisplayName, appType: AppType.GameStream, gameId: overview.gameid });
        return true;
      }
    }

    return false;
  }

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

  private initInterceptor(): void {
    this.unregisterCallback = registerForGameLaunchIntercept((gameId, cancel) => {
      const entry = (() => {
        for (const [, value] of this.managedApps.entries()) {
          if (value.gameId === gameId) {
            return value;
          }
        }
        return null;
      })();
      if (entry !== null) {
        const moonDeckApp = this.moondeckAppLauncher.moonDeckApp;
        if (moonDeckApp.value !== null) {
          if (moonDeckApp.value.steamAppId !== entry.appId || !moonDeckApp.canRedirect()) {
            cancel();
          }
        } else if (this.launchingApp) {
          // To account of user clicking the button insanely fast again...
          cancel();
        } else {
          cancel();
          this.launchingApp = true;
          this.moondeckAppLauncher.launchApp(entry.appId, entry.appName, entry.appType)
            .catch((err) => logger.critical(err))
            .finally(() => { this.launchingApp = false; });
        }
      }
    });
  }

  constructor(private readonly moondeckAppLauncher: MoonDeckAppLauncher) {
  }

  async init(): Promise<void> {
    this.initAppStoreObservable();
    this.initInterceptor();

    const relevantDetails = await getAllGameStreamAppDetails();
    for (const details of relevantDetails) {
      this.processAppDetails(details);
    }
  }

  deinit(): void {
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
}
