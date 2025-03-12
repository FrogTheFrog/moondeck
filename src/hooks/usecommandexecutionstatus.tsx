import { useContext, useEffect, useState } from "react";
import { MoonDeckContext } from "../contexts";
import { Subscription } from "rxjs";

export function useCommandExecutionStatus(): boolean {
  const { connectivityManager } = useContext(MoonDeckContext);
  const [executionStatus, setExecutionStatus] = useState(connectivityManager.commandProxy.executing.value);

  useEffect(() => {
    const sub = new Subscription();

    sub.add(connectivityManager.commandProxy.executing.asObservable().subscribe((status) => setExecutionStatus(status)));
    return () => {
      sub.unsubscribe();
    };
  }, []);

  return executionStatus;
}
