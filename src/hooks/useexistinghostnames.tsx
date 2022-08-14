import { SettingsManager, UserSettings } from "../lib";
import { useEffect, useState } from "react";

export interface ExistingHostNames {
  currentId: string | null;
  entries: Array<{
    id: string;
    name: string;
  }>;
}
export type HostNames = ExistingHostNames | null;

function getHostNames(settings: UserSettings | null): HostNames {
  if (settings !== null) {
    const entries = Object.entries(settings.hostSettings).map(([id, hostSettings]) => { return { id, name: hostSettings.hostName }; });
    return { currentId: settings.currentHostId, entries };
  }

  return null;
}

export function useExistingHostNames(settingsManager: SettingsManager): ExistingHostNames | null {
  const [hostNames, setHostNames] = useState(getHostNames(settingsManager.settings.value));

  useEffect(() => {
    const sub = settingsManager.settings.asObservable().subscribe((settings) => setHostNames(getHostNames(settings)));
    return () => {
      sub.unsubscribe();
    };
  }, []);

  return hostNames;
}
