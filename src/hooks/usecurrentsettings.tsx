import { useContext, useEffect, useState } from "react";
import { MoonDeckContext } from "../contexts";
import { UserSettings } from "../lib";
import { cloneDeep } from "lodash";

export function useCurrentSettings(): Readonly<UserSettings | null> {
  const { settingsManager } = useContext(MoonDeckContext);
  const [settings, setSettings] = useState(cloneDeep(settingsManager.settings.value));

  useEffect(() => {
    const sub = settingsManager.settings.asObservable().subscribe((value) => setSettings(cloneDeep(value)));
    return () => {
      sub.unsubscribe();
    };
  }, []);

  return settings;
}
