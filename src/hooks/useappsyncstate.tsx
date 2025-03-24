import { useContext, useEffect, useState } from "react";
import { MoonDeckContext } from "../contexts";
import { StateData } from "../lib";

export function useAppSyncState(): StateData {
  const { appSyncState } = useContext(MoonDeckContext);
  const [state, setState] = useState(appSyncState.getState());

  useEffect(() => {
    const sub = appSyncState.asObservable().subscribe((value) => setState(value));
    return () => {
      sub.unsubscribe();
    };
  }, []);

  return state;
}
