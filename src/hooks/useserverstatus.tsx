import { ConnectivityManager, ServerStatus, logger } from "../lib";
import { Subscription, debounceTime } from "rxjs";
import { useEffect, useState } from "react";

export function useServerStatus(connectivityManager: ConnectivityManager): [ServerStatus, boolean] {
  const [serverStatus, setServerStatus] = useState(connectivityManager.serverProxy.status.value);
  const [refreshStatus, setRefreshStatus] = useState(connectivityManager.serverProxy.refreshing.value);

  useEffect(() => {
    const sub = new Subscription();

    sub.add(connectivityManager.serverProxy.status.asObservable().subscribe((status) => setServerStatus(status)));
    sub.add(connectivityManager.serverProxy.refreshing.asObservable().pipe(debounceTime(1000)).subscribe((refresh) => setRefreshStatus(refresh)));

    connectivityManager.serverAutoRefresh.start().catch((e) => logger.critical(e));
    return () => {
      connectivityManager.serverAutoRefresh.stop().catch((e) => logger.critical(e));
      sub.unsubscribe();
    };
  }, []);

  return [serverStatus, refreshStatus];
}
