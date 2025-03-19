import { OsType, SettingsManager } from "./settingsmanager";
import { BehaviorSubject } from "rxjs";
import { Mutex } from "async-mutex";
import { ReadonlySubject } from "./readonlysubject";
import { call } from "@decky/api";
import { logger } from "./logger";

export type BuddyStatus = "VersionMismatch" | "Restarting" | "ShuttingDown" | "Suspending" | "NoClientId" | "NotPaired" | "Pairing" | "SslVerificationFailed" | "Exception" | "Offline" | "Online";
export type GameStreamAppNames = string[] | null;
export type NonSteamAppData = Array<{ appId: string; appName: string }> | null;

interface ClientInfo {
  hostId: string;
  address: string;
  buddyPort: number;
  clientId: string;
}

interface BuddyInfo {
  status: BuddyStatus;
  info: {
    mac: string;
    os: OsType;
  } | null;
}

async function getBuddyInfo(info: ClientInfo, timeout: number): Promise<BuddyInfo> {
  try {
    return await call<[string, number, string, number], BuddyInfo>("get_buddy_info", info.address, info.buddyPort, info.clientId, timeout);
  } catch (message) {
    logger.critical("Error while fetching buddy info: ", message);
  }

  return { status: "Offline", info: null };
}

async function getGameStreamAppNames(info: ClientInfo, timeout: number): Promise<GameStreamAppNames> {
  try {
    return await call<[string, number, string, number], GameStreamAppNames>("get_gamestream_app_names", info.address, info.buddyPort, info.clientId, timeout);
  } catch (message) {
    logger.critical("Error while fetching gamestream apps: ", message);
  }

  return null;
}

async function getNonSteamAppData(info: ClientInfo, userId: string): Promise<NonSteamAppData> {
  try {
    return await call<[string, number, string, string], NonSteamAppData>("get_non_steam_app_data", info.address, info.buddyPort, info.clientId, userId);
  } catch (message) {
    logger.critical("Error while fetching non-steam app data: ", message);
  }

  return null;
}

export class BuddyProxy {
  private readonly settingsManager: SettingsManager;

  private readonly mutex = new Mutex();
  private readonly statusSubject = new BehaviorSubject<BuddyStatus>("Offline");
  private readonly refreshingSubject = new BehaviorSubject<boolean>(false);

  readonly status = new ReadonlySubject(this.statusSubject);
  readonly refreshing = new ReadonlySubject(this.refreshingSubject);

  private updateInfo(buddyInfo: BuddyInfo): void {
    const info = buddyInfo.info;
    if (info) {
      this.settingsManager.updateHost((hostSettings) => {
        hostSettings.mac = info.mac;
        hostSettings.os = info.os;
      });
    }
    if (this.statusSubject.value !== buddyInfo.status) {
      this.statusSubject.next(buddyInfo.status);
    }
  }

  private getClientInfo(): ClientInfo | null {
    const hostSettings = this.settingsManager.hostSettings;
    const hostId = this.settingsManager.settings.value?.currentHostId ?? null;
    const address = hostSettings?.address ?? null;
    const buddyPort = hostSettings?.buddyPort ?? null;
    const clientId = this.settingsManager.settings.value?.clientId ?? null;

    if (hostId === null || address === null || buddyPort === null || clientId === null) {
      return null;
    }

    return { hostId, address, buddyPort, clientId };
  }

  constructor(settingsManager: SettingsManager) {
    this.settingsManager = settingsManager;
  }

  async refreshStatus(): Promise<void> {
    if (this.mutex.isLocked()) {
      await this.mutex.waitForUnlock();
      return;
    }

    const release = await this.mutex.acquire();
    try {
      this.refreshingSubject.next(true);

      const clientInfo = this.getClientInfo();
      if (clientInfo === null) {
        this.updateInfo({ status: "Offline", info: null });
        return;
      }

      const result = await getBuddyInfo(clientInfo, 1);
      if (this.settingsManager.settings.value?.currentHostId === clientInfo.hostId) {
        this.updateInfo(result);
      }
    } finally {
      this.refreshingSubject.next(false);
      release();
    }
  }

  async getGameStreamAppNames(): Promise<GameStreamAppNames> {
    const clientInfo = this.getClientInfo();
    if (clientInfo === null) {
      return null;
    }

    return await getGameStreamAppNames(clientInfo, 3);
  }

  async getNonSteamAppData(): Promise<NonSteamAppData> {
    const clientInfo = this.getClientInfo();
    if (clientInfo === null) {
      return null;
    }

    return await getNonSteamAppData(clientInfo, "some id lol");
  }
}
