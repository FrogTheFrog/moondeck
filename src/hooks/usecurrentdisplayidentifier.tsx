import { getDisplayIdentifiers, logger, registerForDisplayStateChanges } from "../lib";
import { useEffect, useState } from "react";

export function useCurrentDisplayIdentifier(): string | null {
  const [currentDisplay, setCurrentDisplay] = useState<string | null>(null);

  useEffect(() => {
    const unsub = registerForDisplayStateChanges(() => {
      getDisplayIdentifiers().then((displays) => {
        setCurrentDisplay(displays?.current ?? null);
      }).catch((error) => logger.error(error));
    });
    return () => {
      unsub();
    };
  }, []);

  return currentDisplay;
}
