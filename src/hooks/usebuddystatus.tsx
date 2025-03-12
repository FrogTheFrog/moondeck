import { BuddyStatus, logger } from "../lib";
import { Subscription, debounceTime } from "rxjs";
import { useContext, useEffect, useState } from "react";
import { MoonDeckContext } from "../contexts";

export function useBuddyStatus(observe?: boolean): [BuddyStatus, boolean] {
  const { connectivityManager } = useContext(MoonDeckContext);
  const [buddyStatus, setBuddyStatus] = useState(connectivityManager.buddyProxy.status.value);
  const [refreshStatus, setRefreshStatus] = useState(connectivityManager.buddyProxy.refreshing.value);

  useEffect(() => {
    if (observe === false) {
      return;
    }

    const sub = new Subscription();

    sub.add(connectivityManager.buddyProxy.status.asObservable().subscribe((status) => setBuddyStatus(status)));
    sub.add(connectivityManager.buddyProxy.refreshing.asObservable().pipe(debounceTime(1000)).subscribe((refresh) => setRefreshStatus(refresh)));

    connectivityManager.buddyAutoRefresh.start().catch((e) => logger.critical(e));
    return () => {
      connectivityManager.buddyAutoRefresh.stop().catch((e) => logger.critical(e));
      sub.unsubscribe();
    };
  }, typeof observe === "boolean" ? [observe] : []);

  return [buddyStatus, refreshStatus];
}
