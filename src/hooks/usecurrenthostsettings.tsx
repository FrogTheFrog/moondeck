import { HostSettings, SettingsManager, UserSettings } from "../lib";
import { useEffect, useState } from "react";
import { cloneDeep } from "lodash";

export interface CurrentHostSettings extends HostSettings {
  clientId: string;
  currentHostId: string;
}

function getCurrentHostSettings(settings: Readonly<UserSettings> | null): CurrentHostSettings | null {
  if (settings === null || settings.currentHostId === null) {
    return null;
  }

  const hostSettings = cloneDeep(settings.hostSettings[settings.currentHostId]);
  if (hostSettings === undefined) {
    return null;
  }

  return { clientId: settings.clientId, currentHostId: settings.currentHostId, ...hostSettings };
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
