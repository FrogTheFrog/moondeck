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

export interface HostGameControl {
  address: string;
  buddyPort: number;
  clientId: string;
  gameId: string;
  appId: string;
}

export interface MoonDeckAppData {
  steamAppId: number;
  moonDeckAppId: number | null;
  name: string;
  appType: AppType;
  redirected: boolean;
  beingKilled: boolean;
  quittingHost: boolean;
  hostControl: HostGameControl | null;
  sessionOptions: SessionOptions;
}

export class MoonDeckAppProxy extends ReadonlySubject<MoonDeckAppData | null> {
  private readonly commandProxy: CommandProxy;

  constructor(commandProxy: CommandProxy) {
    super(new BehaviorSubject<MoonDeckAppData | null>(null));
    this.commandProxy = commandProxy;
  }

  setApp(steamAppId: number, moonDeckAppId: number, name: string, appType: AppType, sessionOptions: SessionOptions, hostControl: HostGameControl | null): void {
    this.subject.next({
      steamAppId,
      moonDeckAppId: appType === AppType.MoonDeck ? moonDeckAppId : null,
      name,
      appType,
      redirected: false,
      beingKilled: false,
      quittingHost: false,
      hostControl,
      sessionOptions
    });
  }

  getAppId() {
    if (this.subject.value === null) {
      return false;
    }

    return getAppId(this.subject.value);
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

  shouldStopHost(gameId: string): boolean {
    const app = this.subject.value;
    return app !== null && app.appType !== AppType.GameStream && !app.beingKilled && app.hostControl !== null &&
      [app.hostControl.gameId, String(app.steamAppId), String(app.moonDeckAppId)].includes(gameId);
  }

  async quitApp(): Promise<void> {
    const app = this.subject.value;
    if (app === null || app.quittingHost) {
      return;
    }
    const host = app.hostControl;
    if (app.appType === AppType.GameStream || host === null) {
      await this.killApp();
      return;
    }
    this.subject.next({ ...app, quittingHost: true });
    try {
      logger.log(`Stopping host Steam app ${host.appId} before ending stream.`);
      const stopped = await call<[string, number, string, string], boolean>(
        "stop_steam_app", host.address, host.buddyPort, host.clientId, host.appId
      );
      if (!stopped) {
        logger.toast("Could not stop the game on the host. Please quit through the game's menu.", { output: "error" });
        return;
      }
      // Normal game-exit handling may already have closed this session.
      if (this.subject.value?.hostControl === host) {
        await this.killApp();
      }
    } catch (error) {
      logger.critical(error);
      logger.toast("Could not confirm that the host game stopped.", { output: "error" });
    } finally {
      if (this.subject.value?.hostControl === host) {
        this.subject.next({ ...this.subject.value, quittingHost: false });
      }
    }
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
    }
  }

  async unsuspendApp(): Promise<void> {
    if (this.subject.value === null) {
      return;
    }

    if (!await unsuspendRunner()) {
      await this.killApp();
      await this.clearApp();
    }
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
