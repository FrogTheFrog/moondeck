import { ConnectivityManager, MoonDeckAppLauncher, SettingsManager } from "../../lib";
import { useBuddyStatus, useCurrentHostSettings, useCurrentSettings, useMoonDeckAppData, useServerStatus } from "../../hooks";
import { FC } from "react";
import { GameSessionPanel } from "./gamesessionpanel";
import { HostAppPanel } from "./hostapppanel";
import { HostCommandPanel } from "./hostcommandpanel";
import { HostStatusPanel } from "./hoststatuspanel";
import { ResolutionPanel } from "./resolutionpanel";
import { SunshineAppsPanel } from "./sunshineappspanel";
import { useQuickAccessVisible } from "@decky/api";

interface Props {
  connectivityManager: ConnectivityManager;
  settingsManager: SettingsManager;
  moonDeckAppLauncher: MoonDeckAppLauncher;
}

export const QuickSettingsView: FC<Props> = ({ connectivityManager, settingsManager, moonDeckAppLauncher }) => {
  const isVisible = useQuickAccessVisible();
  const [serverStatus, serverRefreshStatus] = useServerStatus(connectivityManager, isVisible);
  const [buddyStatus, buddyRefreshStatus] = useBuddyStatus(connectivityManager, isVisible);
  const currentHostSettings = useCurrentHostSettings(settingsManager);
  const currentSettings = useCurrentSettings(settingsManager);
  const appData = useMoonDeckAppData(moonDeckAppLauncher);

  return (
    <>
      {appData !== null
        ? <GameSessionPanel appData={appData} moonDeckAppLauncher={moonDeckAppLauncher} />
        : <>
            <HostStatusPanel currentHostSettings={currentHostSettings} currentSettings={currentSettings} settingsManager={settingsManager} serverStatus={serverStatus} serverRefreshStatus={serverRefreshStatus} buddyStatus={buddyStatus} buddyRefreshStatus={buddyRefreshStatus} />
            <SunshineAppsPanel buddyProxy={connectivityManager.buddyProxy} currentHostSettings={currentHostSettings} currentSettings={currentSettings} />
            <HostAppPanel currentHostSettings={currentHostSettings} currentSettings={currentSettings} settingsManager={settingsManager} />
            <ResolutionPanel currentHostSettings={currentHostSettings} currentSettings={currentSettings} settingsManager={settingsManager} />
          </>
      }
      {currentHostSettings !== null &&
        <HostCommandPanel connectivityManager={connectivityManager} serverStatus={serverStatus} buddyStatus={buddyStatus} />
      }
    </>
  );
};
