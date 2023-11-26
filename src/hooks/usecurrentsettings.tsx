import { SettingsManager, UserSettings } from "../lib";
import { useEffect, useState } from "react";
import { cloneDeep } from "lodash";

export function useCurrentSettings(settingsManager: SettingsManager): Readonly<UserSettings | null> {
  const [settings, setSettings] = useState(cloneDeep(settingsManager.settings.value));

  useEffect(() => {
    const sub = settingsManager.settings.asObservable().subscribe((value) => setSettings(cloneDeep(value)));
    return () => {
      sub.unsubscribe();
    };
  }, []);

  return settings;
}
