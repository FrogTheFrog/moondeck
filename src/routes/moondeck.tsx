import { ConnectivityManager, SettingsManager, ShortcutManager } from "../lib";
import { ServerAPI, SidebarNavigation } from "decky-frontend-lib";
import { ButtonStyleView } from "../components/buttonstyleview";
import { ChangelogView } from "../components/changelogview";
import { GameSessionView } from "../components/gamesessionview";
import { HostSelectionView } from "../components/hostselectionview";
import { HostSettingsView } from "../components/hostsettingsview";
import { MoonlightSettingsView } from "../components/moonlightsettingsview";
import { RunnerSettingsView } from "../components/runnersettingsview";
import { SetupGuideView } from "../components/setupguideview";
import { ShortcutsView } from "../components/shortcutsview";
import { StatusIndicatorsView } from "../components/statusindicatorsview";
import { SunshineAppsView } from "../components/sunshineappsview";
import { VFC } from "react";

interface Props {
  connectivityManager: ConnectivityManager;
  serverAPI: ServerAPI;
  settingsManager: SettingsManager;
  shortcutManager: ShortcutManager;
}

const MoonDeckRouter: VFC<Props> = ({ connectivityManager, settingsManager, serverAPI, shortcutManager }) => {
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
          content: <MoonlightSettingsView serverAPI={serverAPI} settingsManager={settingsManager} />,
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
          content: <ShortcutsView shortcutManager={shortcutManager} />,
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
  props.serverAPI.routerHook.addRoute("/moondeck", () => <MoonDeckRouter {...props} />);
  return () => {
    props.serverAPI.routerHook.removeRoute("/moondeck");
  };
}
