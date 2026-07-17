import { getAllNonSteamAppDetails, logger, registerForLoginStateChange, waitForServicesInitialized } from "./lib";
import { MoonDeckMain } from "./components/icons";
import { QuickSettingsView } from "./components/quicksettingsview/quicksettingsview";
import { RouteManager } from "./routes";
import { TitleView } from "./components/titleview";
import { definePlugin } from "@decky/api";
import { getDefaultContext } from "./contexts";
import { sleep } from "@decky/ui";

export default definePlugin(() => {
  const { moonDeckAppShortcuts, externalAppShortcuts, settingsManager, connectivityManager, moonDeckAppLauncher } = getDefaultContext(true);
  const routeManager = new RouteManager();

  let initializing = false;
  const initCallback = async (username: string): Promise<void> => {
    if (await waitForServicesInitialized()) {
      logger.log(`Initializing plugin for ${username}`);
      initializing = true;
      do {
        const allAppDetails = await getAllNonSteamAppDetails();
        if (!initializing) {
          return;
        }

        if (allAppDetails === null) {
          logger.error(`Delaying initialization by 5 seconds.`);
          await sleep(5000);
          continue;
        }

        externalAppShortcuts.init(allAppDetails);
        moonDeckAppShortcuts.init(allAppDetails);
        settingsManager.init();
        connectivityManager.init();
        moonDeckAppLauncher.init();

        // Always the last
        routeManager.init();
        initializing = false;
      } while (initializing);
    } else {
      logger.toast(`Failed to initialize Steam lib for ${username}!`, { output: "error" });
    }
  };
  const deinitCallback = (): void => {
    logger.log("Deinitializing plugin");
    initializing = false;

    // Always the first
    routeManager.deinit();

    moonDeckAppLauncher.deinit();
    connectivityManager.deinit();
    settingsManager.deinit();
    moonDeckAppShortcuts.deinit();
    externalAppShortcuts.deinit();
  };
  const unregister = registerForLoginStateChange(
    (username) => { initCallback(username).catch((e) => logger.critical(e)); },
    deinitCallback
  );

  return {
    name: "MoonDeck",
    icon: <MoonDeckMain />,
    content: <QuickSettingsView />,
    onDismount() {
      unregister();
      deinitCallback();
    },
    alwaysRender: true,
    titleView: <TitleView />
  };
});
