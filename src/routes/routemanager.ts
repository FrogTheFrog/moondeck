import { ConnectivityManager, MoonDeckAppLauncher, SettingsManager, ShortcutManager } from "../lib";
import { LibraryAppHook } from "./libaryapp";
import { MoonDeckRouterHook } from "./moondeck";

export class RouteManager {
  private moonDeckRouteUnhook: (() => void) | null = null;
  private libraryAppUnhook: (() => void) | null = null;

  constructor(private readonly connectivityManager: ConnectivityManager,
    private readonly settingsManager: SettingsManager,
    private readonly shortcutManager: ShortcutManager,
    private readonly moonDeckAppLauncher: MoonDeckAppLauncher
  ) {
  }

  init(): void {
    this.moonDeckRouteUnhook = MoonDeckRouterHook({
      connectivityManager: this.connectivityManager,
      settingsManager: this.settingsManager,
      shortcutManager: this.shortcutManager
    });
    this.libraryAppUnhook = LibraryAppHook({
      moonDeckAppLauncher: this.moonDeckAppLauncher,
      settingsManager: this.settingsManager
    });
  }

  deinit(): void {
    if (this.moonDeckRouteUnhook !== null) {
      this.moonDeckRouteUnhook();
      this.moonDeckRouteUnhook = null;
    }
    if (this.libraryAppUnhook !== null) {
      this.libraryAppUnhook();
      this.libraryAppUnhook = null;
    }
  }
}
