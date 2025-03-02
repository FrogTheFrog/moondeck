import { AppType, setShortcutName, terminateApp } from "./steamutils";
import { BehaviorSubject } from "rxjs";
import { CommandProxy } from "./commandproxy";
import { ReadonlySubject } from "./readonlysubject";
import { call } from "@decky/api";
import { isEqual } from "lodash";
import { logger } from "./logger";

async function killRunner(appId: number): Promise<void> {
  try {
    await call<[number], unknown>("kill_runner", appId);
  } catch (message) {
    logger.critical("Error while killing runner script: ", message);
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
  beingSuspended: boolean;
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
      beingSuspended: false,
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

  async killApp(): Promise<void> {
    if (this.subject.value === null) {
      return;
    }

    this.subject.next({ ...this.subject.value, beingKilled: true });

    const nameSetToAppId = this.subject.value.sessionOptions.nameSetToAppId;
    const appId = this.subject.value.moonDeckAppId ?? this.subject.value.steamAppId;
    // Necessary, otherwise the termination fails
    await this.changeName(false);
    if (!await terminateApp(appId, 5000)) {
      logger.warn("Failed to terminate, trying to kill!");
      await killRunner(appId);
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

    this.subject.next({ ...this.subject.value, beingSuspended: true });
    await this.killApp();
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

    const appId = this.subject.value.moonDeckAppId ?? this.subject.value.steamAppId;
    return await isRunnerActive(appId);
  }
}
