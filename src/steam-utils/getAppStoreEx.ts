import { IInterceptor, IMapDidChange, IMapWillChange, Lambda, ObservableMap } from "mobx";

export interface AppStoreOverview {
  display_name: string;
  gameid: string;
  appid: number;
  rt_last_time_locally_played?: number;
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
    if (this.appStore.m_mapApps.observe_) {
      // MobX 6
      return this.appStore.m_mapApps.observe_(listener, fireImmediately);
    }

    // MobX 5
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return (this.appStore.m_mapApps as any).observe(listener, fireImmediately) as Lambda;
  }

  intercept(handler: IInterceptor<IMapWillChange<number, AppStoreOverview>>): Lambda {
    if (this.appStore.m_mapApps.intercept_) {
      // MobX 6
      return this.appStore.m_mapApps.intercept_(handler);
    }

    // MobX 5
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    return (this.appStore.m_mapApps as any).intercept(handler) as Lambda;
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
