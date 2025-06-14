import { BuddySettingsView } from "../components/buddysettingsview";
import { ButtonStyleView } from "../components/buttonstyleview";
import { ChangelogView } from "../components/changelogview";
import { FC } from "react";
import { GameSessionView } from "../components/gamesessionview";
import { GameStreamAppsView } from "../components/gamestreamappsview";
import { HostInfoView } from "../components/hostinfoview";
import { HostSelectionView } from "../components/hostselectionview";
import { MoonDeckAppsView } from "../components/moondeckappsview";
import { MoonlightSettingsView } from "../components/moonlightsettingsview";
import { NonSteamAppsView } from "../components/nonsteamappsview/nonsteamappsview";
import { RunnerSettingsView } from "../components/runnersettingsview";
import { SetupGuideView } from "../components/setupguideview";
import { SidebarNavigation } from "@decky/ui";
import { StatusIndicatorsView } from "../components/statusindicatorsview";
import { routerHook } from "@decky/api";

const MoonDeckRouter: FC<object> = () => {
  return (
    <SidebarNavigation
      pages={[
        {
          title: "Setup Guide",
          content: <SetupGuideView />,
          route: "/moondeck/setup-guide"
        },
        {
          title: "Status Indicators",
          content: <StatusIndicatorsView />,
          route: "/moondeck/status-indicators"
        },
        {
          title: "Changelog",
          content: <ChangelogView />,
          route: "/moondeck/changelog"
        },
        "separator",
        {
          title: "Host Selection",
          content: <HostSelectionView />,
          route: "/moondeck/host-selection"
        },
        {
          title: "Host Info",
          content: <HostInfoView />,
          route: "/moondeck/host-info"
        },
        "separator",
        {
          title: "Moonlight Settings",
          content: <MoonlightSettingsView />,
          route: "/moondeck/resolution-settings"
        },
        {
          title: "Buddy Settings",
          content: <BuddySettingsView />,
          route: "/moondeck/buddy-settings"
        },
        {
          title: "Runner Settings",
          content: <RunnerSettingsView />,
          route: "/moondeck/runner-settings"
        },
        "separator",
        {
          title: "MoonDeck Apps",
          content: <MoonDeckAppsView />,
          route: "/moondeck/moondeck-apps"
        },
        {
          title: "GameStream Apps",
          content: <GameStreamAppsView />,
          route: "/moondeck/gamestream-apps"
        },
        {
          title: "Non-Steam Apps",
          content: <NonSteamAppsView />,
          route: "/moondeck/non-steam-apps"
        },
        "separator",
        {
          title: "Game Session",
          content: <GameSessionView />,
          route: "/moondeck/game-session"
        },
        {
          title: "Button Style",
          content: <ButtonStyleView />,
          route: "/moondeck/button-style"
        }
      ]}
    />
  );
};

export function MoonDeckRouterHook(): () => void {
  routerHook.addRoute("/moondeck", () => <MoonDeckRouter />);
  return () => {
    routerHook.removeRoute("/moondeck");
  };
}
