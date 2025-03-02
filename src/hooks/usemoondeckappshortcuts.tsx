import { useContext, useEffect, useState } from "react";
import { MoonDeckAppInfo } from "../lib";
import { MoonDeckContext } from "../contexts";

function toArray(apps: Map<number, MoonDeckAppInfo>): MoonDeckAppInfo[] {
  return Array.from(apps.values())
    .sort((a, b) => a.appName < b.appName ? -1 : a.appName > b.appName ? 1 : 0);
}

export function useMoonDeckAppShortcuts(): MoonDeckAppInfo[] {
  const { moonDeckAppShortcuts } = useContext(MoonDeckContext);
  const [shortcuts, setShortcuts] = useState(toArray(moonDeckAppShortcuts.appInfo.value));

  useEffect(() => {
    const sub = moonDeckAppShortcuts.appInfo.asObservable().subscribe((value) => setShortcuts(toArray(value)));
    return () => {
      sub.unsubscribe();
    };
  }, []);

  return shortcuts;
}
