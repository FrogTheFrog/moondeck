import { BehaviorSubject } from "rxjs";
import { BuddyProxy } from "./buddyproxy";
import { Mutex } from "async-mutex";
import { ReadonlySubject } from "./readonlysubject";
import { ServerProxy } from "./serverproxy";
import { SettingsManager } from "./settingsmanager";
import { call } from "@decky/api";
import { logger } from "./logger";
import { sleep } from "@decky/ui";

type PcStateChange = "Restart" | "Shutdown" | "Suspend";

async function wakeOnLan(hostName: string, address: string, mac: string, port: number, customExec: string | null): Promise<void> {
  try {
    await call<[string, string, string, number, string | null], unknown>("wake_on_lan", hostName, address, mac, port, customExec);
  } catch (message) {
    logger.critical("Error while sending WOL: ", message);
  }
}

async function changePcState(address: string, buddyPort: number, clientId: string, state: PcStateChange, timeout: number): Promise<void> {
  try {
    await call<[string, number, string, PcStateChange, number], unknown>("change_pc_state", address, buddyPort, clientId, state, timeout);
  } catch (message) {
    logger.critical("Error while changing PC state: ", message);
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

  async doChangePcState(state: PcStateChange): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      this.executingSubject.next(true);
      if (this.buddyProxy.status.value === "Online") {
        const hostSettings = this.settingsManager.hostSettings;
        const address = hostSettings?.address ?? null;
        const buddyPort = hostSettings?.buddy.port ?? null;
        const clientId = this.settingsManager.settings.value?.clientId ?? null;

        if (address !== null && buddyPort !== null && clientId !== null) {
          await changePcState(address, buddyPort, clientId, state, 5);
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
    await this.doChangePcState("Restart");
  }

  async shutdownPC(): Promise<void> {
    await this.doChangePcState("Shutdown");
  }

  async suspendPC(): Promise<void> {
    await this.doChangePcState("Suspend");
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
