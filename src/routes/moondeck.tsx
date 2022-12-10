import { ConnectivityManager, SettingsManager, ShortcutManager } from "../lib";
import { ServerAPI, SidebarNavigation } from "decky-frontend-lib";
import { AboutView } from "../components/aboutview";
import { ButtonStyleView } from "../components/buttonstyleview";
import { GameSessionView } from "../components/gamesessionview";
import { HostSelectionView } from "../components/hostselectionview";
import { HostSettingsView } from "../components/hostinfoview";
import { SetupGuideView } from "../components/setupguideview";
import { ShortcutsView } from "../components/shortcutsview";
import { StatusIndicatorsView } from "../components/statusindicatorsview";
import { VFC } from "react";

interface Props {
  connectivityManager: ConnectivityManager;
  serverAPI: ServerAPI;
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
          title: "Game Session",
          content: <GameSessionView settingsManager={settingsManager} />,
          route: "/moondeck/game-session"
        },
        {
          title: "Host Selection",
          content: <HostSelectionView connectivityManager={connectivityManager} settingsManager={settingsManager} />,
          route: "/moondeck/host-selection"
        },
        {
          title: "Host Settings",
          content: <HostSettingsView settingsManager={settingsManager} />,
          route: "/moondeck/host-info"
        },
        {
          title: "Shortcuts",
          content: <ShortcutsView shortcutManager={shortcutManager} />,
          route: "/moondeck/shortcuts"
        },
        {
          title: "Button Style",
          content: <ButtonStyleView settingsManager={settingsManager} />,
          route: "/moondeck/button-style"
        },
        {
          title: "About",
          content: <AboutView />,
          route: "/moondeck/about"
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
