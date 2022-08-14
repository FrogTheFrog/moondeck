import { SettingsManager, UserSettings } from "../lib";
import { useEffect, useState } from "react";

export function useCurrentSettings(settingsManager: SettingsManager): Readonly<UserSettings | null> {
  const [settings, setSettings] = useState(settingsManager.settings.value);

  useEffect(() => {
    const sub = settingsManager.settings.asObservable().subscribe((value) => setSettings(value));
    return () => {
      sub.unsubscribe();
    };
  }, []);

  return settings;
}
