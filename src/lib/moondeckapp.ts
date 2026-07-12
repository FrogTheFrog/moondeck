import { AppType, setShortcutName, terminateApp } from "./steamutils";
import { BehaviorSubject } from "rxjs";
import { CommandProxy } from "./commandproxy";
import { ReadonlySubject } from "./readonlysubject";
import { call } from "@decky/api";
import { isEqual } from "lodash";
import { logger } from "./logger";

async function killRunner(appId: number | null): Promise<void> {
  try {
    await call<[number | null], unknown>("kill_runner", appId);
  } catch (message) {
    logger.critical("Error while killing runner script: ", message);
  }
}

async function suspendRunner(): Promise<boolean> {
  try {
    return await call<[], boolean>("suspend_runner");
  } catch (message) {
    logger.critical("Error while suspending runner script: ", message);
    return false;
  }
}

async function unsuspendRunner(): Promise<boolean> {
  try {
    return await call<[], boolean>("unsuspend_runner");
  } catch (message) {
    logger.critical("Error while unsuspending runner script: ", message);
    return false;
  }
}

async function isRunnerActive(appId: number): Promise<boolean> {
  try {
    await call<[number], boolean>("is_runner_active", appId);
  } catch (message) {
    logger.critical("Error while getting runner status: ", message);
  }
  return false;
}

async function getRunnerResult(): Promise<string | null> {
  try {
    return await call<[], string | null>("get_runner_result");
  } catch (message) {
    logger.critical("Error while fetching runner result: ", message);
  }

  return "Error while fetching runner result!";
}

function getAppId(appData: MoonDeckAppData) {
  return appData.moonDeckAppId ?? appData.steamAppId;
}

export interface SessionOptions {
  nameSetToAppId: boolean;
}

export interface MoonDeckAppData {
  steamAppId: number;
  moonDeckAppId: number | null;
  name: string;
  appType: AppType;
  redirected: boolean;
  beingKilled: boolean;
  sessionOptions: SessionOptions;
}

export class MoonDeckAppProxy extends ReadonlySubject<MoonDeckAppData | null> {
  private readonly commandProxy: CommandProxy;

  constructor(commandProxy: CommandProxy) {
    super(new BehaviorSubject<MoonDeckAppData | null>(null));
    this.commandProxy = commandProxy;
  }

  setApp(steamAppId: number, moonDeckAppId: number, name: string, appType: AppType, sessionOptions: SessionOptions): void {
    this.subject.next({
      steamAppId,
      moonDeckAppId: appType === AppType.MoonDeck ? moonDeckAppId : null,
      name,
      appType,
      redirected: false,
      beingKilled: false,
      sessionOptions
    });
  }

  async applySessionOptions(): Promise<void> {
    const options = this.subject.value?.sessionOptions ?? null;
    if (options === null) {
      return;
    }

    if (!await this.changeName(options.nameSetToAppId)) {
      logger.toast("Failed to change shortcut name!", { output: "warn" });
    }
  }

  async changeName(changeToAppId: boolean): Promise<boolean> {
    if (this.subject.value === null) {
      return false;
    }

    // Name changing is only supported for MoonDeck app types
    if (this.subject.value.moonDeckAppId === null) {
      return true;
    }

    let result = true;
    if (changeToAppId) {
      result = await setShortcutName(this.subject.value.moonDeckAppId, `${this.subject.value.steamAppId}`);
    } else {
      result = await setShortcutName(this.subject.value.moonDeckAppId, this.subject.value.name);
    }

    if (this.subject.value === null) {
      return false;
    }

    if (result) {
      const newValue = { ...this.subject.value, sessionOptions: { ...this.subject.value.sessionOptions, nameSetToAppId: changeToAppId } };
      if (!isEqual(this.subject.value, newValue)) {
        this.subject.next(newValue);
      }
    }

    return result;
  }

  canRedirect(): boolean {
    if (this.subject.value === null || this.subject.value.redirected) {
      return false;
    }

    this.subject.next({ ...this.subject.value, redirected: true });
    return true;
  }

  async clearApp(): Promise<void> {
    if (this.subject.value === null) {
      return;
    }

    await this.changeName(false);
    this.subject.next(null);
  }

  async closeSteamOnHost(): Promise<void> {
    if (this.subject.value === null) {
      return;
    }

    await this.commandProxy.closeSteam(false);
  }

  async killApp(forceCleanup = false): Promise<void> {
    if (this.subject.value === null) {
      if (forceCleanup) {
        await killRunner(null);
      }
      return;
    }

    this.subject.next({ ...this.subject.value, beingKilled: true });

    const nameSetToAppId = this.subject.value.sessionOptions.nameSetToAppId;
    const appId = getAppId(this.subject.value);
    // Necessary, otherwise the termination fails
    await this.changeName(false);
    if (!await terminateApp(appId, 5000)) {
      logger.warn("Failed to terminate, trying to kill!");
      await killRunner(appId);
    }

    // If someone cleared it already, we can exit YAY \0/
    if (this.subject.value === null) {
      return;
    }

    // Reset the original value
    if (nameSetToAppId) {
      const newValue = { ...this.subject.value, sessionOptions: { ...this.subject.value.sessionOptions, nameSetToAppId } };
      if (!isEqual(this.subject.value, newValue)) {
        this.subject.next(newValue);
      }
    }
  }

  async suspendApp(): Promise<void> {
    if (this.subject.value === null) {
      return;
    }

    if (!await suspendRunner()) {
      await this.killApp();
      await this.clearApp();

      // Even if we failed to suspend app, we should still continue suspending
      // host PC at least.
    }

    // The buddy status state might not be up to date unless we have
    // explicitly updated it, however if the app is running we can assume it is...
    await this.commandProxy.suspendPC({ ignoreStatus: true });
  }

  async unsuspendApp(): Promise<void> {
    if (this.subject.value === null) {
      return;
    }

    await unsuspendRunner();
    return;

    // if (await this.isStillRunning() && await unsuspendRunner()) {
    //   return;
    // }

    // // Cleanup any leftovers and clear the state
    // await this.killApp();
    // await this.clearApp();
  }

  async getRunnerResult(): Promise<string | null> {
    return await getRunnerResult();
  }

  async clearRunnerResult(): Promise<void> {
    // Getting the result clears it automatically
    await this.getRunnerResult();
  }

  async isStillRunning(): Promise<boolean> {
    if (this.subject.value === null) {
      return false;
    }

    const appId = getAppId(this.subject.value);
    return await isRunnerActive(appId);
  }
}
