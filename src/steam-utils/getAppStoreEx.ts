import { IInterceptor, IMapDidChange, IMapWillChange, Lambda, ObservableMap } from "mobx";

export interface AppStoreOverview {
  display_name: string;
  gameid: string;
  appid: number;
  rt_last_time_locally_played?: number;
  is_available_on_current_platform?: boolean;
}

interface AppStore {
  m_mapApps: ObservableMap<number, AppStoreOverview>;
}

export class AppStoreEx {
  constructor(private readonly appStore: AppStore) {
  }

  getAppOverview(appId: number): AppStoreOverview | null {
    return this.appStore.m_mapApps.get(appId) ?? null;
  }

  setAppOverview(appId: number, overview: AppStoreOverview): void {
    this.appStore.m_mapApps.set(appId, overview);
  }

  observe(listener: (changes: IMapDidChange<number, AppStoreOverview>) => void, fireImmediately?: boolean): Lambda {
    return this.appStore.m_mapApps.observe_(listener, fireImmediately);
  }

  intercept(handler: IInterceptor<IMapWillChange<number, AppStoreOverview>>): Lambda {
    return this.appStore.m_mapApps.intercept_(handler);
  }
}

/**
 * @returns The extended AppStore interface or null if not available.
 */
export function getAppStoreEx(): AppStoreEx | null {
  const store = (window as unknown as { appStore?: AppStore }).appStore ?? null;
  if (!store) {
    return null;
  }

  return new AppStoreEx(store);
}
