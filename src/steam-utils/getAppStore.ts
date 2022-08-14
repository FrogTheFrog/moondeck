import { ObservableMap } from "mobx";

export interface SteamAppOverview {
  display_name: string;
  gameid: string;
}

export interface AppStoreDetails {
  appid: number;
  rt_last_time_locally_played?: number;
}

export interface AppStore {
  m_mapApps: ObservableMap<number, AppStoreDetails>;
  GetAppOverviewByAppID: (value: number) => Promise<SteamAppOverview | undefined | null>;
}

/**
 * @returns The AppStore interface or null if not available.
 */
export function getAppStore(): AppStore | null {
  return (window as unknown as { appStore?: AppStore }).appStore ?? null;
}
