import { ServerAPI, sleep } from "decky-frontend-lib";
import { BehaviorSubject } from "rxjs";
import { BuddyProxy } from "./buddyproxy";
import { Mutex } from "async-mutex";
import { ReadonlySubject } from "./readonlysubject";
import { ServerProxy } from "./serverproxy";
import { SettingsManager } from "./settingsmanager";
import { logger } from "./logger";

async function wakeOnLan(serverAPI: ServerAPI, address: string, mac: string): Promise<void> {
  try {
    const resp = await serverAPI.callPluginMethod<{ address: string; mac: string }, null>("wake_on_lan", { address, mac });
    if (!resp.success) {
      logger.error("Error while sending WOL: " + resp.result);
    }
  } catch (message) {
    logger.critical(message);
  }
}

async function restartPC(serverAPI: ServerAPI, address: string, buddyPort: number, clientId: string, timeout: number): Promise<void> {
  try {
    const resp = await serverAPI.callPluginMethod<{ address: string; buddy_port: number; client_id: string; timeout: number }, null>("restart_pc", { address, buddy_port: buddyPort, client_id: clientId, timeout });
    if (!resp.success) {
      logger.error("Error while restarting PC: " + resp.result);
    }
  } catch (message) {
    logger.critical(message);
  }
}

async function shutdownPC(serverAPI: ServerAPI, address: string, buddyPort: number, clientId: string, timeout: number): Promise<void> {
  try {
    const resp = await serverAPI.callPluginMethod<{ address: string; buddy_port: number; client_id: string; timeout: number }, null>("shutdown_pc", { address, buddy_port: buddyPort, client_id: clientId, timeout });
    if (!resp.success) {
      logger.error("Error while shutting down PC: " + resp.result);
    }
  } catch (message) {
    logger.critical(message);
  }
}

async function closeSteam(serverAPI: ServerAPI, address: string, buddyPort: number, clientId: string, timeout: number): Promise<void> {
  try {
    const resp = await serverAPI.callPluginMethod<{ address: string; buddy_port: number; client_id: string; timeout: number }, null>("close_steam", { address, buddy_port: buddyPort, client_id: clientId, timeout });
    if (!resp.success) {
      logger.error("Error while trying to close Steam on host PC: " + resp.result);
    }
  } catch (message) {
    logger.critical(message);
  }
}

export class CommandProxy {
  private readonly serverAPI: ServerAPI;
  private readonly settingsManager: SettingsManager;
  private readonly buddyProxy: BuddyProxy;
  private readonly serverProxy: ServerProxy;

  private readonly mutex = new Mutex();
  private readonly executingSubject = new BehaviorSubject<boolean>(false);

  readonly executing = new ReadonlySubject(this.executingSubject);

  async doRestartOrShutdownPC(restart: boolean): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      this.executingSubject.next(true);
      if (this.buddyProxy.status.value === "Online") {
        const hostSettings = this.settingsManager.hostSettings;
        const address = hostSettings?.address ?? null;
        const buddyPort = hostSettings?.buddyPort ?? null;
        const clientId = this.settingsManager.settings.value?.clientId ?? null;

        if (address !== null && buddyPort !== null && clientId !== null) {
          if (restart) {
            await restartPC(this.serverAPI, address, buddyPort, clientId, 5);
          } else {
            await shutdownPC(this.serverAPI, address, buddyPort, clientId, 5);
          }
          await sleep(2 * 1000);
          await this.buddyProxy.refreshStatus();
        }
      }
    } finally {
      this.executingSubject.next(false);
      release();
    }
  }

  constructor(serverAPI: ServerAPI, settingsManager: SettingsManager, buddyProxy: BuddyProxy, serverProxy: ServerProxy) {
    this.serverAPI = serverAPI;
    this.settingsManager = settingsManager;
    this.buddyProxy = buddyProxy;
    this.serverProxy = serverProxy;
  }

  async wakeOnLan(): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      this.executingSubject.next(true);
      if (this.buddyProxy.status.value === "Offline" && this.serverProxy.status.value === "Offline") {
        const hostSettings = this.settingsManager.hostSettings;
        const address = hostSettings?.address ?? null;
        const mac = hostSettings?.mac ?? null;

        if (address !== null && mac !== null) {
          await wakeOnLan(this.serverAPI, address, mac);
          await sleep(2 * 1000);
        }
      }
    } finally {
      this.executingSubject.next(false);
      release();
    }
  }

  async restartPC(): Promise<void> {
    await this.doRestartOrShutdownPC(true);
  }

  async shutdownPC(): Promise<void> {
    await this.doRestartOrShutdownPC(false);
  }

  async closeSteam(triggerExecutionChange = true): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      if (triggerExecutionChange) {
        this.executingSubject.next(true);
      }

      if (this.buddyProxy.status.value === "Online") {
        const hostSettings = this.settingsManager.hostSettings;
        const address = hostSettings?.address ?? null;
        const buddyPort = hostSettings?.buddyPort ?? null;
        const clientId = this.settingsManager.settings.value?.clientId ?? null;

        if (address !== null && buddyPort !== null && clientId !== null) {
          await closeSteam(this.serverAPI, address, buddyPort, clientId, 5);
          await sleep(2 * 1000);
        }
      }
    } finally {
      if (triggerExecutionChange) {
        this.executingSubject.next(false);
      }
      release();
    }
  }
}
