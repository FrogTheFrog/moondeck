import { MoonDeckAppData, MoonDeckAppLauncher } from "../lib";
import { useEffect, useState } from "react";

export function useMoonDeckAppData(moonDeckAppLauncher: MoonDeckAppLauncher): Readonly<MoonDeckAppData> | null {
  const [appData, setAppData] = useState<Readonly<MoonDeckAppData> | null>(moonDeckAppLauncher.moonDeckApp.value);

  useEffect(() => {
    const sub = moonDeckAppLauncher.moonDeckApp.asObservable().subscribe((value) => setAppData(value));
    return () => {
      sub.unsubscribe();
    };
  }, []);

  return appData;
}
