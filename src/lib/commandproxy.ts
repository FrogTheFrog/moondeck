import { BuddyProxy, BuddyStatus } from "./buddyproxy";
import { HostSettings, SettingsManager, UserSettings } from "./settingsmanager";
import { ServerProxy, ServerStatus } from "./serverproxy";
import { BehaviorSubject } from "rxjs";
import { Mutex } from "async-mutex";
import { ReadonlySubject } from "./readonlysubject";
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

async function abortHostStateChange(address: string, buddyPort: number, clientId: string, timeout: number): Promise<void> {
  try {
    await call<[string, number, string, number], unknown>("abort_host_state_change", address, buddyPort, clientId, timeout);
  } catch (message) {
    logger.critical("Error while aborting host state change: ", message);
  }
}

async function closeSteam(address: string, buddyPort: number, clientId: string, timeout: number): Promise<void> {
  try {
    await call<[string, number, string, number], unknown>("close_steam", address, buddyPort, clientId, timeout);
  } catch (message) {
    logger.critical("Error while trying to close Steam on host PC: ", message);
  }
}

type Callback = () => Promise<void>;
type CallbackWithSettings = (userSettings: Readonly<UserSettings>, hostSettings: Readonly<HostSettings>) => Promise<void>;
interface InvocationOptions {
  locked: boolean;
  validBuddyStatus: BuddyStatus[];
  validServerStatus: ServerStatus[];
  updateExecutionState: boolean;
}
const defaultInvocationOptions: InvocationOptions = { locked: true, validBuddyStatus: [], validServerStatus: [], updateExecutionState: true };
const defaultDelay = 10;
const defaultTimeout = 3;
const defaultSleepForUX = 2000;

export const validAbortPcStateChangeStates: BuddyStatus[] = ["Restarting", "ShuttingDown", "Suspending", "Hibernating"];

export class CommandProxy {
  private readonly settingsManager: SettingsManager;
  private readonly buddyProxy: BuddyProxy;
  private readonly serverProxy: ServerProxy;

  private readonly mutex = new Mutex();
  private readonly executingSubject = new BehaviorSubject<boolean>(false);

  readonly executing = new ReadonlySubject(this.executingSubject);

  private withMutex(callback: Callback) {
    return async () => {
      const release = await this.mutex.acquire();
      try {
        await callback();
      } finally {
        release();
      }
    };
  }

  private withBuddyStatus(callback: Callback, validStatus: BuddyStatus[]) {
    return async () => {
      if (validStatus.includes(this.buddyProxy.status.value)) {
        await callback();
      }
    };
  }

  private withServerStatus(callback: Callback, validStatus: ServerStatus[]) {
    return async () => {
      if (validStatus.includes(this.serverProxy.status.value)) {
        await callback();
      }
    };
  }

  private withExecutionState(callback: Callback) {
    return async () => {
      try {
        this.executingSubject.next(true);
        await callback();
      } finally {
        this.executingSubject.next(false);
      }
    };
  }

  private withSettings(callback: CallbackWithSettings) {
    return async () => {
      const userSettings = this.settingsManager.settings.value;
      const hostSettings = this.settingsManager.hostSettings;
      if (userSettings && hostSettings) {
        await callback(userSettings, hostSettings);
      }
    };
  }

  private async invokeCallback(callback: CallbackWithSettings, options: InvocationOptions = defaultInvocationOptions) {
    let wrappedCallback = this.withSettings(callback);
    if (options.validBuddyStatus.length > 0) {
      wrappedCallback = this.withBuddyStatus(wrappedCallback, options.validBuddyStatus);
    }
    if (options.validServerStatus.length > 0) {
      wrappedCallback = this.withServerStatus(wrappedCallback, options.validServerStatus);
    }
    if (options.updateExecutionState) {
      wrappedCallback = this.withExecutionState(wrappedCallback);
    }
    if (options.locked) {
      wrappedCallback = this.withMutex(wrappedCallback);
    }

    await wrappedCallback();
  }

  private async changePcState(callback: CallbackWithSettings, validBuddyStatus: BuddyStatus[] = ["Online"]): Promise<void> {
    await this.invokeCallback(async (userSettings, hostSettings) => {
      await callback(userSettings, hostSettings);
      await sleep(defaultSleepForUX);
      await this.buddyProxy.refreshStatus();
    }, { ...defaultInvocationOptions, validBuddyStatus });
  }

  constructor(settingsManager: SettingsManager, buddyProxy: BuddyProxy, serverProxy: ServerProxy) {
    this.settingsManager = settingsManager;
    this.buddyProxy = buddyProxy;
    this.serverProxy = serverProxy;
  }

  async wakeOnLan(): Promise<void> {
    await this.invokeCallback(async (_, { hostName, address, mac, wolSettings }) => {
      await wakeOnLan(hostName, address, mac, wolSettings.port, wolSettings.useCustomWolExec ? wolSettings.customWolExecPath : null);
      await sleep(defaultSleepForUX);
    }, { ...defaultInvocationOptions, validBuddyStatus: ["Offline"], validServerStatus: ["Offline"] });
  }

  async restartPC(): Promise<void> {
    await this.changePcState(async ({ clientId }, { address, buddy }) => {
      await restartHost(address, buddy.port, clientId, defaultDelay, defaultTimeout);
    });
  }

  async shutdownPC(): Promise<void> {
    await this.changePcState(async ({ clientId }, { address, buddy }) => {
      await shutdownHost(address, buddy.port, clientId, defaultDelay, defaultTimeout);
    });
  }

  async suspendPC(): Promise<void> {
    await this.changePcState(async ({ clientId }, { address, buddy }) => {
      await suspendHost(address, buddy.port, clientId, defaultDelay, defaultTimeout);
    });
  }

  async hibernatePC(): Promise<void> {
    await this.changePcState(async ({ clientId }, { address, buddy }) => {
      await hibernateHost(address, buddy.port, clientId, defaultDelay, defaultTimeout);
    });
  }

  async abortPcStateChange(): Promise<void> {
    await this.changePcState(async ({ clientId }, { address, buddy }) => {
      await abortHostStateChange(address, buddy.port, clientId, defaultTimeout);
    }, validAbortPcStateChangeStates);
  }

  async closeSteam(updateExecutionState = true): Promise<void> {
    await this.invokeCallback(async ({ clientId }, { address, buddy }) => {
      await closeSteam(address, buddy.port, clientId, defaultTimeout);
      await sleep(defaultSleepForUX);
    }, { ...defaultInvocationOptions, validBuddyStatus: ["Online"], updateExecutionState });
  }
}
