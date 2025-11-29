import { useBuddyStatus, useCurrentHostSettings, useCurrentSettings, useMoonDeckAppData, useServerStatus } from "../../hooks";
import { ExternalAppsPanel } from "./externalappspanel";
import { FC } from "react";
import { GameSessionPanel } from "./gamesessionpanel";
import { HostAppPanel } from "./hostapppanel";
import { HostCommandPanel } from "./hostcommandpanel";
import { HostStatusPanel } from "./hoststatuspanel";
import { ResolutionPanel } from "./resolutionpanel";
import { useQuickAccessVisible } from "@decky/api";

export const QuickSettingsView: FC = () => {
  const isVisible = useQuickAccessVisible();
  const [serverStatus, serverRefreshStatus] = useServerStatus(isVisible);
  const [buddyStatus, buddyRefreshStatus] = useBuddyStatus(isVisible);
  const currentHostSettings = useCurrentHostSettings();
  const currentSettings = useCurrentSettings();
  const appData = useMoonDeckAppData();

  return (
    <>
      {appData !== null ?
          <GameSessionPanel appData={appData} /> :
          <>
            <HostStatusPanel currentHostSettings={currentHostSettings} currentSettings={currentSettings} serverStatus={serverStatus} serverRefreshStatus={serverRefreshStatus} buddyStatus={buddyStatus} buddyRefreshStatus={buddyRefreshStatus} />
            <ExternalAppsPanel currentHostSettings={currentHostSettings} />
            <HostAppPanel currentHostSettings={currentHostSettings} currentSettings={currentSettings} />
            <ResolutionPanel currentHostSettings={currentHostSettings} currentSettings={currentSettings} />
          </>}
      {
        currentHostSettings !== null &&
        <HostCommandPanel serverStatus={serverStatus} buddyStatus={buddyStatus} />
      }
    </>
  );
};
