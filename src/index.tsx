import { ConnectivityManager, MoonDeckAppLauncher, SettingsManager, ShortcutManager, logger, registerForLoginStateChange, waitForServicesInitialized } from "./lib";
import { ServerAPI, definePlugin } from "decky-frontend-lib";
import { SimpleTitleView, TitleView } from "./components/titleview";
import { MoonDeckMain } from "./components/icons";
import { QuickSettingsView } from "./components/quicksettingsview/quicksettingsview";
import { RouteManager } from "./routes";

export default definePlugin((serverAPI: ServerAPI) => {
  logger.init(serverAPI);

  const shortcutManager = new ShortcutManager();
  const settingsManager = new SettingsManager(serverAPI);
  const connectivityManager = new ConnectivityManager(serverAPI, settingsManager);
  const moonDeckAppLauncher = new MoonDeckAppLauncher(serverAPI, settingsManager, shortcutManager, connectivityManager.commandProxy);
  const routeManager = new RouteManager(serverAPI, connectivityManager, settingsManager, shortcutManager, moonDeckAppLauncher);

  const initCallback = async (username: string): Promise<void> => {
    if (await waitForServicesInitialized()) {
      logger.log(`Initializing plugin for ${username}`);
      await shortcutManager.init();
      settingsManager.init();
      connectivityManager.init();
      moonDeckAppLauncher.init();
      routeManager.init();
    } else {
      logger.toast(`Failed to initialize Steam lib for ${username}!`, { output: "error" });
    }
  };
  const deinitCallback = (): void => {
    logger.log("Deinitializing plugin");
    routeManager.deinit();
    moonDeckAppLauncher.deinit();
    connectivityManager.deinit();
    settingsManager.deinit();
    shortcutManager.deinit();
  };
  const unregister = registerForLoginStateChange(
    (username) => { initCallback(username).catch((e) => logger.critical(e)); },
    deinitCallback
  );

  return {
    titleView: <TitleView />,
    title: <SimpleTitleView />,
    content: <QuickSettingsView connectivityManager={connectivityManager} settingsManager={settingsManager} moonDeckAppLauncher={moonDeckAppLauncher}/>,
    icon: <MoonDeckMain />,
    alwaysRender: true,
    onDismount() {
      unregister();
      deinitCallback();
    }
  };
});
