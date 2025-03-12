import { useContext, useEffect, useState } from "react";
import { MoonDeckAppData } from "../lib";
import { MoonDeckContext } from "../contexts";

export function useMoonDeckAppData(): Readonly<MoonDeckAppData> | null {
  const { moonDeckAppLauncher } = useContext(MoonDeckContext);
  const [appData, setAppData] = useState<Readonly<MoonDeckAppData> | null>(moonDeckAppLauncher.moonDeckApp.value);

  useEffect(() => {
    const sub = moonDeckAppLauncher.moonDeckApp.asObservable().subscribe((value) => setAppData(value));
    return () => {
      sub.unsubscribe();
    };
  }, []);

  return appData;
}
