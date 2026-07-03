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

async function abortHostStateChange(address: string, buddyPort: number, clientId: string, timeout: number): Promise<boolean> {
  try {
    return await call<[string, number, string, number], boolean>("abort_host_state_change", address, buddyPort, clientId, timeout);
  } catch (message) {
    logger.critical("Error while aborting host state change: ", message);
    return false;
  }
}

async function closeSteam(address: string, buddyPort: number, clientId: string, timeout: number): Promise<void> {
  try {
    await call<[string, number, string, number], unknown>("close_steam", address, buddyPort, clientId, timeout);
  } catch (message) {
    logger.critical("Error while trying to close Steam on host PC: ", message);
  }
}

async function endStream(address: string, buddyPort: number, clientId: string, timeout: number): Promise<void> {
  try {
    await call<[string, number, string, number], unknown>("end_stream", address, buddyPort, clientId, timeout);
  } catch (message) {
    logger.critical("Error while trying to end Stream on host PC: ", message);
  }
}

type Callback<T = void> = () => Promise<T>;
type CallbackWithSettings<T = void> = (userSettings: Readonly<UserSettings>, hostSettings: Readonly<HostSettings>) => Promise<T>;
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

  private withMutex<T>(callback: Callback<T>) {
    return async () => {
      const release = await this.mutex.acquire();
      try {
        return await callback();
      } finally {
        release();
      }
    };
  }

  private withBuddyStatus<T>(callback: Callback<T>, validStatus: BuddyStatus[]) {
    return async () => {
      if (validStatus.includes(this.buddyProxy.status.value)) {
        return await callback();
      }
      return undefined;
    };
  }

  private withServerStatus<T>(callback: Callback<T>, validStatus: ServerStatus[]) {
    return async () => {
      if (validStatus.includes(this.serverProxy.status.value)) {
        return await callback();
      }
      return undefined;
    };
  }

  private withExecutionState<T>(callback: Callback<T>) {
    return async () => {
      try {
        this.executingSubject.next(true);
        return await callback();
      } finally {
        this.executingSubject.next(false);
      }
    };
  }

  private withSettings<T>(callback: CallbackWithSettings<T>) {
    return async () => {
      const userSettings = this.settingsManager.settings.value;
      const hostSettings = this.settingsManager.hostSettings;
      if (userSettings && hostSettings) {
        return await callback(userSettings, hostSettings);
      }
      return undefined;
    };
  }

  private async invokeCallback<T>(callback: CallbackWithSettings<T>, options: InvocationOptions = defaultInvocationOptions) {
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

    return await wrappedCallback();
  }

  private async changePcState<T>(callback: CallbackWithSettings<T>, validBuddyStatus: BuddyStatus[] = ["Online"]) {
    return await this.invokeCallback(async (userSettings, hostSettings) => {
      const result = await callback(userSettings, hostSettings);
      await sleep(defaultSleepForUX);
      await this.buddyProxy.refreshStatus();
      return result;
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

  async restartPC(additionalCleanup?: Callback): Promise<void> {
    await this.changePcState(async ({ clientId }, { address, buddy }) => {
      await additionalCleanup?.();
      await closeSteam(address, buddy.port, clientId, defaultTimeout);
      await endStream(address, buddy.port, clientId, defaultTimeout);
      await restartHost(address, buddy.port, clientId, defaultDelay, defaultTimeout);
    });
  }

  async shutdownPC(additionalCleanup?: Callback): Promise<void> {
    await this.changePcState(async ({ clientId }, { address, buddy }) => {
      await additionalCleanup?.();
      await closeSteam(address, buddy.port, clientId, defaultTimeout);
      await endStream(address, buddy.port, clientId, defaultTimeout);
      await shutdownHost(address, buddy.port, clientId, defaultDelay, defaultTimeout);
    });
  }

  async suspendPC(options: { additionalCleanup?: Callback; ignoreStatus?: boolean } = {}): Promise<void> {
    await this.changePcState(async ({ clientId }, { address, buddy }) => {
      await options.additionalCleanup?.();
      await suspendHost(address, buddy.port, clientId, defaultDelay, defaultTimeout);
    }, options.ignoreStatus ? [] : ["Online"]);
  }

  async hibernatePC(options: { additionalCleanup?: Callback; ignoreStatus?: boolean } = {}): Promise<void> {
    await this.changePcState(async ({ clientId }, { address, buddy }) => {
      await options.additionalCleanup?.();
      await hibernateHost(address, buddy.port, clientId, defaultDelay, defaultTimeout);
    }, options.ignoreStatus ? [] : ["Online"]);
  }

  async abortPcStateChange(): Promise<boolean> {
    return await this.changePcState(async ({ clientId }, { address, buddy }) => {
      return await abortHostStateChange(address, buddy.port, clientId, defaultTimeout);
    }, validAbortPcStateChangeStates) ?? false;
  }

  async closeSteam(updateExecutionState = true): Promise<void> {
    await this.invokeCallback(async ({ clientId }, { address, buddy }) => {
      await closeSteam(address, buddy.port, clientId, defaultTimeout);
      await sleep(defaultSleepForUX);
    }, { ...defaultInvocationOptions, validBuddyStatus: ["Online"], updateExecutionState });
  }
}
