import { useContext, useEffect, useState } from "react";
import { MoonDeckContext } from "../contexts";

export function useExternalAppsSyncing(): boolean {
  const { externalAppShortcuts } = useContext(MoonDeckContext);
  const [syncing, setSyncing] = useState(externalAppShortcuts.syncing.value);

  useEffect(() => {
    const sub = externalAppShortcuts.syncing.asObservable().subscribe((value) => setSyncing(value));
    return () => {
      sub.unsubscribe();
    };
  }, []);

  return syncing;
}
