import { SettingsManager, UserSettings } from "../lib";
import { useEffect, useState } from "react";

export interface CurrentHostSettings {
  clientId: string;
  currentHostId: string;
  buddyPort: number;
  address: string;
  hostName: string;
  mac: string;
}

function getCurrentHostSettings(settings: Readonly<UserSettings> | null): CurrentHostSettings | null {
  if (settings === null || settings.currentHostId === null) {
    return null;
  }

  const hostSettings = settings.hostSettings[settings.currentHostId];
  if (hostSettings === undefined) {
    return null;
  }

  return {
    clientId: settings.clientId,
    currentHostId: settings.currentHostId,
    buddyPort: hostSettings.buddyPort,
    address: hostSettings.address,
    hostName: hostSettings.hostName,
    mac: hostSettings.mac
  };
}

export function useCurrentHostSettings(settingsManager: SettingsManager): CurrentHostSettings | null {
  const [hostSettings, setHostSettings] = useState(getCurrentHostSettings(settingsManager.settings.value));

  useEffect(() => {
    const sub = settingsManager.settings.asObservable().subscribe((settings) => setHostSettings(getCurrentHostSettings(settings)));
    return () => {
      sub.unsubscribe();
    };
  }, []);

  return hostSettings;
}
