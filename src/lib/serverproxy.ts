import { HostSettings, SettingsManager, appLaunchDefault, appLaunchStabilityDefault, buddyRequestsDefault, initialConditionsDefault, networkReconnectAfterSuspendDefault, servicePingDefault, steamLaunchAfterSuspendDefault, steamLaunchDefault, steamReadinessDefault, streamEndDefault, streamReadinessDefault, wakeOnLanDefault } from "./settingsmanager";
import { BehaviorSubject } from "rxjs";
import { BuddyProxy } from "./buddyproxy";
import { Mutex } from "async-mutex";
import { ReadonlySubject } from "./readonlysubject";
import { call } from "@decky/api";
import { logger } from "./logger";

export interface GameStreamHost {
  address: string;
  port: number;
  hostName: string;
  uniqueId: string;
}

export type ServerStatus = "Offline" | "Online";
export type PairingStartStatus = "PairingStarted" | "Offline" | (string & {}); // eslint-disable-line

async function scanForHosts(timeout: number): Promise<GameStreamHost[]> {
  try {
    return await call<[number], GameStreamHost[]>("scan_for_hosts", timeout);
  } catch (message) {
    logger.critical("Error while scanning for hosts: ", message);
  }
  return [];
}

async function findHost(hostId: string, timeout: number): Promise<GameStreamHost | null> {
  try {
    return await call<[string, number], GameStreamHost | null>("find_host", hostId, timeout);
  } catch (message) {
    logger.critical("Error while finding host: ", message);
  }
  return null;
}

async function getServerInfo(address: string, port: number, timeout: number): Promise<GameStreamHost | null> {
  try {
    return await call<[string, number, number], GameStreamHost | null>("get_server_info", address, port, timeout);
  } catch (message) {
    logger.critical("Error while getting server info: ", message);
  }
  return null;
}

async function startPairing(address: string, buddyPort: number, clientId: string, pin: number, timeout: number): Promise<PairingStartStatus> {
  try {
    return await call<[string, number, string, number, number], PairingStartStatus>("start_pairing", address, buddyPort, clientId, pin, timeout);
  } catch (message) {
    logger.critical("Error while pairing with buddy: ", message);
  }
  return "Offline";
}

async function abortPairing(address: string, buddyPort: number, clientId: string, timeout: number): Promise<void> {
  try {
    await call<[string, number, string, number], unknown>("abort_pairing", address, buddyPort, clientId, timeout);
  } catch (message) {
    logger.critical("Error while aborting pairing: ", message);
  }
}

export class ServerProxy {
  private readonly settingsManager: SettingsManager;
  private readonly buddyProxy: BuddyProxy;

  private readonly mutex = new Mutex();
  private readonly statusSubject = new BehaviorSubject<ServerStatus>("Offline");
  private readonly refreshingSubject = new BehaviorSubject<boolean>(false);

  readonly status = new ReadonlySubject(this.statusSubject);
  readonly refreshing = new ReadonlySubject(this.refreshingSubject);

  private updateHostSettingsUnlocked(host: GameStreamHost, selectHost: boolean, staticAddress: boolean | null): void {
    this.settingsManager.update((settings) => {
      const currentSettings = settings.hostSettings[host.uniqueId] ?? null;
      const hostSettings: HostSettings = {
        hostInfoPort: host.port,
        address: host.address,
        staticAddress: staticAddress ?? (currentSettings?.staticAddress ?? false),
        hostName: host.hostName,
        mac: currentSettings?.mac ?? "00:00:00:00:00:00",
        os: currentSettings?.os ?? "Other",
        resolution: {
          automatic: currentSettings?.resolution.automatic ?? true,
          appResolutionOverride: currentSettings?.resolution.appResolutionOverride ?? "CustomResolution",
          appResolutionOverrideForInternalDisplay: currentSettings?.resolution.appResolutionOverrideForInternalDisplay ?? false,
          useCustomDimensions: currentSettings?.resolution.useCustomDimensions ?? false,
          useLinkedDisplays: currentSettings?.resolution.useLinkedDisplays ?? true,
          selectedDimensionIndex: currentSettings?.resolution.selectedDimensionIndex ?? -1,
          defaultBitrate: currentSettings?.resolution.defaultBitrate ?? null,
          defaultFps: currentSettings?.resolution.defaultFps ?? null,
          defaultHdr: currentSettings?.resolution.defaultHdr ?? null,
          dimensions: currentSettings?.resolution.dimensions ?? []
        },
        audio: {
          defaultOption: currentSettings?.audio.defaultOption ?? null,
          useLinkedAudio: currentSettings?.audio.useLinkedAudio ?? true,
          linkedAudio: currentSettings?.audio.linkedAudio ?? {}
        },
        passToMoonlight: currentSettings?.passToMoonlight ?? true,
        runnerTimeouts: {
          buddyRequests: currentSettings?.runnerTimeouts.buddyRequests ?? buddyRequestsDefault,
          servicePing: currentSettings?.runnerTimeouts.servicePing ?? servicePingDefault,
          initialConditions: currentSettings?.runnerTimeouts.initialConditions ?? initialConditionsDefault,
          streamReadiness: currentSettings?.runnerTimeouts.streamReadiness ?? streamReadinessDefault,
          steamReadiness: currentSettings?.runnerTimeouts.steamReadiness ?? steamReadinessDefault,
          appLaunch: currentSettings?.runnerTimeouts.appLaunch ?? appLaunchDefault,
          appLaunchStability: currentSettings?.runnerTimeouts.appLaunchStability ?? appLaunchStabilityDefault,
          streamEnd: currentSettings?.runnerTimeouts.streamEnd ?? streamEndDefault,
          wakeOnLan: currentSettings?.runnerTimeouts.wakeOnLan ?? wakeOnLanDefault,
          steamLaunch: currentSettings?.runnerTimeouts.steamLaunch ?? steamLaunchDefault,
          steamLaunchAfterSuspend: currentSettings?.runnerTimeouts.steamLaunchAfterSuspend ?? steamLaunchAfterSuspendDefault,
          networkReconnectAfterSuspend: currentSettings?.runnerTimeouts.networkReconnectAfterSuspend ?? networkReconnectAfterSuspendDefault
        },
        buddy: {
          bigPictureMode: currentSettings?.buddy.bigPictureMode ?? true,
          port: currentSettings?.buddy.port ?? 59999,
          closeSteamOnceSessionEnds: currentSettings?.buddy.closeSteamOnceSessionEnds ?? false,
          hostApp: {
            selectedAppIndex: currentSettings?.buddy.hostApp.selectedAppIndex ?? -1,
            apps: currentSettings?.buddy.hostApp.apps ?? []
          }
        },
        gameStreamApps: {
          showQuickAccessButton: currentSettings?.gameStreamApps.showQuickAccessButton ?? false
        },
        nonSteamApps: {
          showQuickAccessButton: currentSettings?.nonSteamApps.showQuickAccessButton ?? false
        }
      };

      settings.currentHostId = selectHost ? host.uniqueId : settings.currentHostId;
      settings.hostSettings[host.uniqueId] = hostSettings;
    });
  }

  private updateStatus(newStatus: ServerStatus): void {
    if (this.statusSubject.value !== newStatus) {
      this.statusSubject.next(newStatus);
    }
  }

  constructor(settingsManager: SettingsManager, buddyProxy: BuddyProxy) {
    this.settingsManager = settingsManager;
    this.buddyProxy = buddyProxy;
  }

  async refreshStatus(): Promise<void> {
    if (this.mutex.isLocked()) {
      await this.mutex.waitForUnlock();
      return;
    }

    const release = await this.mutex.acquire();
    try {
      this.refreshingSubject.next(true);

      const hostId = this.settingsManager.settings.value?.currentHostId ?? null;
      if (hostId === null) {
        this.updateStatus("Offline");
        return;
      }

      let result: GameStreamHost | null = null;
      const hostSettings = this.settingsManager.hostSettings;
      if (hostSettings) {
        result = hostSettings.staticAddress ? await getServerInfo(hostSettings.address, hostSettings.hostInfoPort, 1) : await findHost(hostId, 1);
      } else {
        result = await findHost(hostId, 1);
      }

      if (this.settingsManager.settings.value?.currentHostId === hostId) {
        const newStatus = result?.uniqueId === hostId ? "Online" : "Offline";
        this.updateStatus(newStatus);
      }

      if (result?.uniqueId === hostId) {
        this.updateHostSettingsUnlocked(result, false, null);
      }
    } finally {
      this.refreshingSubject.next(false);
      release();
    }
  }

  async getServerInfo(address: string, port: number): Promise<GameStreamHost | null> {
    return await getServerInfo(address, port, 2);
  }

  async scanForHosts(): Promise<GameStreamHost[]> {
    return await scanForHosts(5);
  }

  async startPairing(pin: number): Promise<PairingStartStatus> {
    const hostSettings = this.settingsManager.hostSettings;

    const address = hostSettings?.address ?? null;
    const buddyPort = hostSettings?.buddy.port ?? null;
    const clientId = this.settingsManager.settings.value?.clientId ?? null;

    if (address === null || buddyPort === null || clientId === null) {
      return "Offlina";
    }

    const result = await startPairing(address, buddyPort, clientId, pin, 5);
    await this.buddyProxy.refreshStatus();
    return result;
  }

  async abortPairing(): Promise<void> {
    const hostSettings = this.settingsManager.hostSettings;

    const address = hostSettings?.address ?? null;
    const buddyPort = hostSettings?.buddy.port ?? null;
    const clientId = this.settingsManager.settings.value?.clientId ?? null;

    if (address === null || buddyPort === null || clientId === null) {
      return;
    }

    await abortPairing(address, buddyPort, clientId, 5);
    await this.buddyProxy.refreshStatus();
  }

  async updateHostSettings(host: GameStreamHost, selectHost: boolean, staticAddress: boolean): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      this.updateHostSettingsUnlocked(host, selectHost, staticAddress);
    } finally {
      release();
    }
  }
}
