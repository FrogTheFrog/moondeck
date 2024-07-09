import { ConnectivityManager, MoonDeckAppLauncher, SettingsManager, ShortcutManager, logger, registerForLoginStateChange, waitForServicesInitialized } from "./lib";
import { MoonDeckMain } from "./components/icons";
import { QuickSettingsView } from "./components/quicksettingsview/quicksettingsview";
import { RouteManager } from "./routes";
import { TitleView } from "./components/titleview";
import { definePlugin } from "@decky/api";

export default definePlugin(() => {
  const shortcutManager = new ShortcutManager();
  const settingsManager = new SettingsManager();
  const connectivityManager = new ConnectivityManager(settingsManager);
  const moonDeckAppLauncher = new MoonDeckAppLauncher(settingsManager, shortcutManager, connectivityManager.commandProxy);
  const routeManager = new RouteManager(connectivityManager, settingsManager, shortcutManager, moonDeckAppLauncher);

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
    name: "MoonDeck",
    icon: <MoonDeckMain />,
    content: <QuickSettingsView connectivityManager={connectivityManager} settingsManager={settingsManager} moonDeckAppLauncher={moonDeckAppLauncher} />,
    onDismount() {
      unregister();
      deinitCallback();
    },
    alwaysRender: true,
    titleView: <TitleView />
  };
});
