import { OsType, SettingsManager } from "./settingsmanager";
import { BehaviorSubject } from "rxjs";
import { Mutex } from "async-mutex";
import { ReadonlySubject } from "./readonlysubject";
import { ServerAPI } from "decky-frontend-lib";
import { logger } from "./logger";

export type BuddyStatus = "VersionMismatch" | "Restarting" | "ShuttingDown" | "Suspending" | "NoClientId" | "NotPaired" | "Pairing" | "SslVerificationFailed" | "Exception" | "Offline" | "Online";

interface BuddyInfo {
  status: BuddyStatus;
  info: {
    mac: string;
    os: OsType;
  } | null;
}

async function getBuddyInfo(serverAPI: ServerAPI, address: string, buddyPort: number, clientId: string, timeout: number): Promise<BuddyInfo> {
  try {
    const resp = await serverAPI.callPluginMethod<{ address: string; buddy_port: number; client_id: string; timeout: number }, BuddyInfo>("get_buddy_info", { address, buddy_port: buddyPort, client_id: clientId, timeout });
    if (resp.success) {
      return resp.result;
    } else {
      logger.error(`Error while fetching buddy info: ${resp.result}`);
    }
  } catch (message) {
    logger.critical(message);
  }

  return { status: "Offline", info: null };
}

async function getGamestreamAppNames(serverAPI: ServerAPI, address: string, buddyPort: number, clientId: string, timeout: number): Promise<string[] | null> {
  try {
    const resp = await serverAPI.callPluginMethod<{ address: string; buddy_port: number; client_id: string; timeout: number }, string[] | null>("get_gamestream_app_names", { address, buddy_port: buddyPort, client_id: clientId, timeout });
    if (resp.success) {
      return resp.result;
    } else {
      logger.error(`Error while fetching gamestream apps: ${resp.result}`);
    }
  } catch (message) {
    logger.critical(message);
  }

  return null;
}

export class BuddyProxy {
  private readonly serverAPI: ServerAPI;
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

  constructor(serverAPI: ServerAPI, settingsManager: SettingsManager) {
    this.serverAPI = serverAPI;
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

      const hostSettings = this.settingsManager.hostSettings;
      const hostId = this.settingsManager.settings.value?.currentHostId ?? null;
      const address = hostSettings?.address ?? null;
      const buddyPort = hostSettings?.buddyPort ?? null;
      const clientId = this.settingsManager.settings.value?.clientId ?? null;

      if (hostId === null || address === null || buddyPort === null || clientId === null) {
        this.updateInfo({ status: "Offline", info: null });
        return;
      }

      const result = await getBuddyInfo(this.serverAPI, address, buddyPort, clientId, 1);
      if (this.settingsManager.settings.value?.currentHostId === hostId) {
        this.updateInfo(result);
      }
    } finally {
      this.refreshingSubject.next(false);
      release();
    }
  }

  async getGamestreamAppNames(): Promise<string[] | null> {
    const hostSettings = this.settingsManager.hostSettings;
    const hostId = this.settingsManager.settings.value?.currentHostId ?? null;
    const address = hostSettings?.address ?? null;
    const buddyPort = hostSettings?.buddyPort ?? null;
    const clientId = this.settingsManager.settings.value?.clientId ?? null;

    if (hostId === null || address === null || buddyPort === null || clientId === null) {
      return null;
    }

    return await getGamestreamAppNames(this.serverAPI, address, buddyPort, clientId, 3);
  }
}
