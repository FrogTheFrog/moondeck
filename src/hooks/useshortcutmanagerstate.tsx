import { useEffect, useState } from "react";
import { ShortcutManager } from "../lib";

export function useShortcutManagerState(shortcutManager: ShortcutManager): boolean {
  const [isReady, setIsReady] = useState(shortcutManager.readyState.value);

  useEffect(() => {
    const sub = shortcutManager.readyState.asObservable().subscribe((ready) => setIsReady(ready));
    return () => {
      sub.unsubscribe();
    };
  }, []);

  return isReady;
}
