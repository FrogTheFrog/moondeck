import { SteamClientEx } from "./shared";
import { logger } from "../lib/logger";

export interface AudioDevices {
  activeOutputDevice: string | null;
  outputDevices: string[];
}

/**
 * @returns Active audio device name together with available devices.
 */
export async function getAudioDevices(): Promise<AudioDevices> {
  try {
    const knownExternalDeviceNames = ["Rembrandt Radeon High Definition Audio Controller", "HD-Audio Generic"];
    const knownInternalDeviceNames = ["Raven/Raven2/FireFlight/Renoir Audio Processor", "ACP/ACP3X/ACP6x Audio Coprocessor"];
    const audioData = await (SteamClient as SteamClientEx).System.Audio.GetDevices();
    const validDevices = audioData.vecDevices.filter((device) => {
      const invalidNames = ["echo-cancel", "input.virtual", "filter-chain-sink", "output.virtual", "filter-chain-source"];
      for (const invalidName of invalidNames) {
        if (device.sName.startsWith(invalidName)) {
          return false;
        }
      }
      return true;
    });
    const outputDevices = validDevices.filter((device) => {
      return device.bHasOutput;
    }).map((value) => {
      if (knownExternalDeviceNames.includes(value.sName)) {
        value.sName = "External device";
      } else if (knownInternalDeviceNames.includes(value.sName)) {
        value.sName = "Speakers";
      }
      return value;
    });

    const outputId = audioData.activeOutputDeviceId;
    const outputDevice = outputDevices.find((device) => {
      return device.id === outputId;
    });

    if (!outputDevice) {
      logger.warn("Failed to find output device from:", audioData);
    }

    return { activeOutputDevice: outputDevice?.sName ?? null, outputDevices: outputDevices.map((device) => device.sName) };
  } catch (error) {
    logger.critical(error);
    return { activeOutputDevice: null, outputDevices: [] };
  }
}
