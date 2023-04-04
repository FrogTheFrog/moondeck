import { BehaviorSubject } from "rxjs";
import { Mutex } from "async-mutex";
import { ReadonlySubject } from "./readonlysubject";
import { ServerAPI } from "decky-frontend-lib";
import { SettingsManager } from "./settingsmanager";
import { logger } from "./logger";

export type BuddyStatus = "VersionMismatch" | "Restarting" | "ShuttingDown" | "Suspending" | "NoClientId" | "NotPaired" | "Pairing" | "SslVerificationFailed" | "Exception" | "Offline" | "Online";

async function getBuddyStatus(serverAPI: ServerAPI, address: string, buddyPort: number, clientId: string, timeout: number): Promise<BuddyStatus> {
  try {
    const resp = await serverAPI.callPluginMethod<{ address: string; buddy_port: number; client_id: string; timeout: number }, BuddyStatus>("get_buddy_status", { address, buddy_port: buddyPort, client_id: clientId, timeout });
    if (resp.success) {
      return resp.result;
    } else {
      logger.error(`Error while fetching buddy status: ${resp.result}`);
    }
  } catch (message) {
    logger.critical(message);
  }

  return "Offline";
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

  private updateStatus(newStatus: BuddyStatus): void {
    if (this.statusSubject.value !== newStatus) {
      this.statusSubject.next(newStatus);
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
        this.updateStatus("Offline");
        return;
      }

      const result = await getBuddyStatus(this.serverAPI, address, buddyPort, clientId, 1);
      if (this.settingsManager.settings.value?.currentHostId === hostId) {
        this.updateStatus(result);
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
