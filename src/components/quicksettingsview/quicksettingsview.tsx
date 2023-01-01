import { ConnectivityManager, MoonDeckAppLauncher, SettingsManager } from "../../lib";
import { useBuddyStatus, useCurrentHostSettings, useMoonDeckAppData, useServerStatus } from "../../hooks";
import { GameSessionPanel } from "./gamesessionpanel";
import { GoToSettingsPanel } from "./gotosettingspanel";
import { HostCommandPanel } from "./hostcommandpanel";
import { HostStatusPanel } from "./hoststatuspanel";
import { ResolutionPanel } from "./resolutionpanel";
import { VFC } from "react";

interface Props {
  connectivityManager: ConnectivityManager;
  settingsManager: SettingsManager;
  moonDeckAppLauncher: MoonDeckAppLauncher;
}

export const QuickSettingsView: VFC<Props> = ({ connectivityManager, settingsManager, moonDeckAppLauncher }) => {
  const [serverStatus, serverRefreshStatus] = useServerStatus(connectivityManager);
  const [buddyStatus, buddyRefreshStatus] = useBuddyStatus(connectivityManager);
  const currentHostSettings = useCurrentHostSettings(settingsManager);
  const appData = useMoonDeckAppData(moonDeckAppLauncher);

  return (
    <>
      <GoToSettingsPanel />
      {appData !== null
        ? <GameSessionPanel appData={appData} moonDeckAppLauncher={moonDeckAppLauncher} />
        : <>
            <HostStatusPanel currentHostSettings={currentHostSettings} serverStatus={serverStatus} serverRefreshStatus={serverRefreshStatus} buddyStatus={buddyStatus} buddyRefreshStatus={buddyRefreshStatus} />
            <ResolutionPanel currentHostSettings={currentHostSettings} settingsManager={settingsManager} />
          </>
      }
      {currentHostSettings !== null &&
        <HostCommandPanel connectivityManager={connectivityManager} serverStatus={serverStatus} buddyStatus={buddyStatus} />
      }
    </>
  );
};
