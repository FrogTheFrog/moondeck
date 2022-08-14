import { useEffect, useState } from "react";
import { ConnectivityManager } from "../lib";
import { Subscription } from "rxjs";

export function useCommandExecutionStatus(connectivityManager: ConnectivityManager): boolean {
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
