import { ConnectivityManager, MoonDeckAppLauncher, SettingsManager, ShortcutManager, logger, registerForLoginStateChange } from "./lib";
import { ServerAPI, definePlugin, findModuleChild, staticClasses } from "decky-frontend-lib";
import { MoonDeckMain } from "./components/icons";
import { QuickSettingsView } from "./components/quicksettingsview/quicksettingsview";
import { RouteManager } from "./routes";

interface LibraryInitializer {
  /**
   * Returns the status whether all the libraries are initialized or not.
   *
   * @note the libraries are initialized when user logs in.
   */
  GetServicesInitialized: () => boolean;

  /**
   * Waits until the services are initialized.
   *
   * @see GetServicesInitialized
   */
  WaitForServicesInitialized: () => Promise<boolean>;
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
const LibraryInitializer = findModuleChild((mod: { [key: string]: Partial<LibraryInitializer> }): unknown => {
  if (typeof mod !== "object") {
    return undefined;
  }

  for (const prop in mod) {
    if (mod[prop]?.WaitForServicesInitialized) {
      return mod[prop];
    }
  }

  return undefined;
}) as LibraryInitializer;

export default definePlugin((serverAPI: ServerAPI) => {
  logger.init(serverAPI);

  const shortcutManager = new ShortcutManager();
  const settingsManager = new SettingsManager(serverAPI);
  const connectivityManager = new ConnectivityManager(serverAPI, settingsManager);
  const moonDeckAppLauncher = new MoonDeckAppLauncher(serverAPI, settingsManager, shortcutManager, connectivityManager.commandProxy);
  const routeManager = new RouteManager(serverAPI, connectivityManager, settingsManager, shortcutManager, moonDeckAppLauncher);

  const initCallback = async (username: string): Promise<void> => {
    if (await LibraryInitializer.WaitForServicesInitialized()) {
      logger.log(`Initializing plugin for ${username}`);
      await shortcutManager.init();
      settingsManager.init();
      connectivityManager.init();
      moonDeckAppLauncher.init();
      routeManager.init();
    } else {
      logger.error(`Failed to initialize Steam lib for ${username}!`);
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
    title: <div className={staticClasses.Title}>MoonDeck</div>,
    content: <QuickSettingsView connectivityManager={connectivityManager} settingsManager={settingsManager} moonDeckAppLauncher={moonDeckAppLauncher}/>,
    icon: <MoonDeckMain />,
    onDismount() {
      unregister();
      deinitCallback();
    }
  };
});
