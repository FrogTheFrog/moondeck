import { useContext, useEffect, useState } from "react";
import { ExternalAppType } from "../lib/externalappshortcuts";
import { MoonDeckContext } from "../contexts";

export function useExternalAppsSyncing(): { purge: boolean; appType: ExternalAppType; current: number; max: string } | null {
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
