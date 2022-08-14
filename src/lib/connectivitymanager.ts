import { BuddyProxy } from "./buddyproxy";
import { CommandProxy } from "./commandproxy";
import { IncrementalLoop } from "./incrementalloop";
import { ServerAPI } from "decky-frontend-lib";
import { ServerProxy } from "./serverproxy";
import { SettingsManager } from "./settingsmanager";
import { Subscription } from "rxjs";
import { logger } from "./logger";

export class ConnectivityManager {
  private readonly serverAPI: ServerAPI;
  private readonly settingsManager: SettingsManager;
  private subscription: Subscription | null = null;

  readonly buddyProxy: BuddyProxy;
  readonly serverProxy: ServerProxy;
  readonly commandProxy: CommandProxy;

  readonly buddyAutoRefresh = new IncrementalLoop(async () => { await this.buddyProxy.refreshStatus(); }, 5000);
  readonly serverAutoRefresh = new IncrementalLoop(async () => { await this.serverProxy.refreshStatus(); }, 5000);

  constructor(serverAPI: ServerAPI, settingsManager: SettingsManager) {
    this.serverAPI = serverAPI;
    this.settingsManager = settingsManager;

    this.buddyProxy = new BuddyProxy(this.serverAPI, this.settingsManager);
    this.serverProxy = new ServerProxy(this.serverAPI, this.settingsManager, this.buddyProxy);
    this.commandProxy = new CommandProxy(this.serverAPI, this.settingsManager, this.buddyProxy, this.serverProxy);
  }

  init(): void {
    this.subscription = new Subscription();
    this.subscription.add(this.settingsManager.settings.asObservable().subscribe(() => {
      this.refresh().catch((e) => logger.critical(e));
    }));
  }

  deinit(): void {
    this.serverAutoRefresh.deinit().catch((e) => logger.critical(e));
    this.buddyAutoRefresh.deinit().catch((e) => logger.critical(e));
    if (this.subscription !== null) {
      this.subscription.unsubscribe();
      this.subscription = null;
    }
  }

  async refresh(): Promise<void> {
    await Promise.all([this.buddyProxy.refreshStatus(), this.serverProxy.refreshStatus()]);
  }
}
