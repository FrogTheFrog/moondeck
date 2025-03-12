import { ButtonStyleView } from "../components/buttonstyleview";
import { ChangelogView } from "../components/changelogview";
import { FC } from "react";
import { GameSessionView } from "../components/gamesessionview";
import { HostSelectionView } from "../components/hostselectionview";
import { HostSettingsView } from "../components/hostsettingsview";
import { MoonDeckAppsView } from "../components/moondeckappsview";
import { MoonlightSettingsView } from "../components/moonlightsettingsview";
import { RunnerSettingsView } from "../components/runnersettingsview";
import { SetupGuideView } from "../components/setupguideview";
import { SidebarNavigation } from "@decky/ui";
import { StatusIndicatorsView } from "../components/statusindicatorsview";
import { SunshineAppsView } from "../components/sunshineappsview";
import { routerHook } from "@decky/api";

const MoonDeckRouter: FC<object> = () => {
  return (
    <SidebarNavigation
      title="MoonDeck"
      showTitle={true}
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
          title: "Host Settings",
          content: <HostSettingsView />,
          route: "/moondeck/host-settings"
        },
        {
          title: "Moonlight Settings",
          content: <MoonlightSettingsView />,
          route: "/moondeck/resolution-settings"
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
          route: "/moondeck/shortcuts"
        },
        {
          title: "Sunshine Apps",
          content: <SunshineAppsView />,
          route: "/moondeck/external-shortcuts"
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
