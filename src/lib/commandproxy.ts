import { BehaviorSubject } from "rxjs";
import { BuddyProxy } from "./buddyproxy";
import { Mutex } from "async-mutex";
import { ReadonlySubject } from "./readonlysubject";
import { ServerProxy } from "./serverproxy";
import { SettingsManager } from "./settingsmanager";
import { call } from "@decky/api";
import { logger } from "./logger";
import { sleep } from "@decky/ui";

async function wakeOnLan(hostName: string, address: string, mac: string, port: number, customExec: string | null): Promise<void> {
  try {
    await call<[string, string, string, number, string | null], unknown>("wake_on_lan", hostName, address, mac, port, customExec);
  } catch (message) {
    logger.critical("Error while sending WOL: ", message);
  }
}

async function restartHost(address: string, buddyPort: number, clientId: string, delaySecs: number, timeout: number): Promise<void> {
  try {
    await call<[string, number, string, number, number], unknown>("restart_host", address, buddyPort, clientId, delaySecs, timeout);
  } catch (message) {
    logger.critical("Error while restarting host: ", message);
  }
}

async function shutdownHost(address: string, buddyPort: number, clientId: string, delaySecs: number, timeout: number): Promise<void> {
  try {
    await call<[string, number, string, number, number], unknown>("shutdown_host", address, buddyPort, clientId, delaySecs, timeout);
  } catch (message) {
    logger.critical("Error while shutting down host: ", message);
  }
}

async function suspendHost(address: string, buddyPort: number, clientId: string, delaySecs: number, timeout: number): Promise<void> {
  try {
    await call<[string, number, string, number, number], unknown>("suspend_host", address, buddyPort, clientId, delaySecs, timeout);
  } catch (message) {
    logger.critical("Error while suspending host: ", message);
  }
}

async function hibernateHost(address: string, buddyPort: number, clientId: string, delaySecs: number, timeout: number): Promise<void> {
  try {
    await call<[string, number, string, number, number], unknown>("hibernate_host", address, buddyPort, clientId, delaySecs, timeout);
  } catch (message) {
    logger.critical("Error while hibernating host: ", message);
  }
}

async function closeSteam(address: string, buddyPort: number, clientId: string, timeout: number): Promise<void> {
  try {
    await call<[string, number, string, number], unknown>("close_steam", address, buddyPort, clientId, timeout);
  } catch (message) {
    logger.critical("Error while trying to close Steam on host PC: ", message);
  }
}

export class CommandProxy {
  private readonly settingsManager: SettingsManager;
  private readonly buddyProxy: BuddyProxy;
  private readonly serverProxy: ServerProxy;

  private readonly mutex = new Mutex();
  private readonly executingSubject = new BehaviorSubject<boolean>(false);

  readonly executing = new ReadonlySubject(this.executingSubject);

  private async changePcState(callback: (address: string, buddyPort: number, clientId: string) => Promise<void>): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      this.executingSubject.next(true);
      if (this.buddyProxy.status.value === "Online") {
        const hostSettings = this.settingsManager.hostSettings;
        const address = hostSettings?.address ?? null;
        const buddyPort = hostSettings?.buddy.port ?? null;
        const clientId = this.settingsManager.settings.value?.clientId ?? null;

        if (address !== null && buddyPort !== null && clientId !== null) {
          await callback(address, buddyPort, clientId);
          await sleep(2 * 1000);
          await this.buddyProxy.refreshStatus();
        }
      }
    } finally {
      this.executingSubject.next(false);
      release();
    }
  }

  constructor(settingsManager: SettingsManager, buddyProxy: BuddyProxy, serverProxy: ServerProxy) {
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
        const hostName = hostSettings?.hostName ?? null;
        const address = hostSettings?.address ?? null;
        const mac = hostSettings?.mac ?? null;
        const port = hostSettings?.wolSettings.port ?? null;
        const useCustomExec = hostSettings?.wolSettings.useCustomWolExec ?? false;
        const customExec = hostSettings?.wolSettings.customWolExecPath ?? null;

        if (hostName !== null && address !== null && mac !== null && port !== null && (!useCustomExec || customExec !== null)) {
          await wakeOnLan(hostName, address, mac, port, useCustomExec ? customExec : null);
          await sleep(2 * 1000);
        }
      }
    } finally {
      this.executingSubject.next(false);
      release();
    }
  }

  async restartPC(): Promise<void> {
    await this.changePcState(async (address: string, buddyPort: number, clientId: string) => {
      await restartHost(address, buddyPort, clientId, 10, 5);
    });
  }

  async shutdownPC(): Promise<void> {
    await this.changePcState(async (address: string, buddyPort: number, clientId: string) => {
      await shutdownHost(address, buddyPort, clientId, 10, 5);
    });
  }

  async suspendPC(): Promise<void> {
    await this.changePcState(async (address: string, buddyPort: number, clientId: string) => {
      await suspendHost(address, buddyPort, clientId, 10, 5);
    });
  }

  async hibernatePC(): Promise<void> {
    await this.changePcState(async (address: string, buddyPort: number, clientId: string) => {
      await hibernateHost(address, buddyPort, clientId, 10, 5);
    });
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
        const buddyPort = hostSettings?.buddy.port ?? null;
        const clientId = this.settingsManager.settings.value?.clientId ?? null;

        if (address !== null && buddyPort !== null && clientId !== null) {
          await closeSteam(address, buddyPort, clientId, 5);
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
