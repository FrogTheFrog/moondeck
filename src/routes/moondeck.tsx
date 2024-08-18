import { ConnectivityManager, SettingsManager, ShortcutManager } from "../lib";
import { ButtonStyleView } from "../components/buttonstyleview";
import { ChangelogView } from "../components/changelogview";
import { GameSessionView } from "../components/gamesessionview";
import { HostSelectionView } from "../components/hostselectionview";
import { HostSettingsView } from "../components/hostsettingsview";
import { MoonlightSettingsView } from "../components/moonlightsettingsview";
import { RunnerSettingsView } from "../components/runnersettingsview";
import { SetupGuideView } from "../components/setupguideview";
import { ShortcutsView } from "../components/shortcutsview";
import { SidebarNavigation } from "@decky/ui";
import { StatusIndicatorsView } from "../components/statusindicatorsview";
import { SunshineAppsView } from "../components/sunshineappsview";
import { VFC } from "react";
import { routerHook } from "@decky/api";

interface Props {
  connectivityManager: ConnectivityManager;
  settingsManager: SettingsManager;
  shortcutManager: ShortcutManager;
}

const MoonDeckRouter: VFC<Props> = ({ connectivityManager, settingsManager, shortcutManager }) => {
  return (
    <SidebarNavigation
      title="MoonDeck"
      showTitle={true}
      pages={[
        {
          title: "Setup Guide",
          content: <SetupGuideView settingsManager={settingsManager} />,
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
          content: <HostSelectionView connectivityManager={connectivityManager} settingsManager={settingsManager} />,
          route: "/moondeck/host-selection"
        },
        {
          title: "Host Settings",
          content: <HostSettingsView settingsManager={settingsManager} />,
          route: "/moondeck/host-settings"
        },
        {
          title: "Moonlight Settings",
          content: <MoonlightSettingsView settingsManager={settingsManager} />,
          route: "/moondeck/resolution-settings"
        },
        {
          title: "Runner Settings",
          content: <RunnerSettingsView settingsManager={settingsManager} />,
          route: "/moondeck/runner-settings"
        },
        "separator",
        {
          title: "MoonDeck Shortcuts",
          content: <ShortcutsView settingsManager={settingsManager} shortcutManager={shortcutManager} />,
          route: "/moondeck/shortcuts"
        },
        {
          title: "Sunshine Apps",
          content: <SunshineAppsView settingsManager={settingsManager} buddyProxy={connectivityManager.buddyProxy} />,
          route: "/moondeck/external-shortcuts"
        },
        "separator",
        {
          title: "Game Session",
          content: <GameSessionView settingsManager={settingsManager} />,
          route: "/moondeck/game-session"
        },
        {
          title: "Button Style",
          content: <ButtonStyleView settingsManager={settingsManager} />,
          route: "/moondeck/button-style"
        }
      ]}
    />
  );
};

export function MoonDeckRouterHook(props: Props): () => void {
  routerHook.addRoute("/moondeck", () => <MoonDeckRouter {...props} />);
  return () => {
    routerHook.removeRoute("/moondeck");
  };
}
