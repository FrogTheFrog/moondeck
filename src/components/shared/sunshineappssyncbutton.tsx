import { AppDetails, ConfirmModal, DialogButton, showModal } from "@decky/ui";
import { AppType, BuddyProxy, EnvVars, HostSettings, addShortcut, checkExecPathMatch, getAppDetailsForAppIds, getEnvKeyValueString, getMoonDeckRunPath, logger, makeEnvKeyValue, removeShortcut, restartSteamClient, setAppLaunchOptions } from "../../lib";
import { FC, useContext, useState } from "react";
import { ExternalAppShortcuts } from "../../lib/externalappshortcuts";
import { MoonDeckContext } from "../../contexts";

interface Props {
  hostSettings: HostSettings;
  noConfirmationDialog?: boolean;
}

function makeLaunchOptions(appName: string): string {
  return `${makeEnvKeyValue(EnvVars.AppType, AppType.GameStream)} ${makeEnvKeyValue(EnvVars.AppName, appName)} %command%`;
}

async function updateLaunchOptions(appId: number, appName: string): Promise<boolean> {
  if (!await setAppLaunchOptions(appId, makeLaunchOptions(appName))) {
    logger.error(`Failed to set shortcut launch options for ${appName}!`);
    return false;
  }
  return true;
}

async function addExternalShortcut(appName: string, moonlightExecPath: string): Promise<number | null> {
  const appId = await addShortcut(appName, moonlightExecPath);
  if (appId == null) {
    logger.error(`Failed to add ${appName} shortcut!`);
    return null;
  }

  return appId;
}

async function syncShortcuts(moonDeckHostApps: string[], buddyProxy: BuddyProxy, externalAppShortcuts: ExternalAppShortcuts): Promise<void> {
  let sunshineApps = await buddyProxy.getGameStreamAppNames();
  if (sunshineApps === null) {
    logger.toast("Failed to get GameStream app list!", { output: "error" });
    return;
  }

  if (!moonDeckHostApps.includes("MoonDeckStream")) {
    moonDeckHostApps.push("MoonDeckStream");
  }

  // Filter out the custom MoonDeck host apps
  sunshineApps = sunshineApps.filter(app => !moonDeckHostApps.includes(app));

  const currentAppDetails = await getAppDetailsForAppIds(Array.from(externalAppShortcuts.appInfo.value.keys()));
  const existingApps = new Map<string, AppDetails>();
  for (const shortcut of currentAppDetails) {
    existingApps.set(shortcut.strDisplayName, shortcut);
  }

  const execPath = await getMoonDeckRunPath();
  if (execPath === null) {
    logger.toast("Failed to get moondeckrun.sh path!", { output: "error" });
    return;
  }

  const appsToAdd = new Set<string>();
  const appsToUpdate: AppDetails[] = [];
  const appsToRemove: AppDetails[] = [];
  let success = true;

  // Check which apps need to be added or updated
  for (const sunshineApp of sunshineApps) {
    const details = existingApps.get(sunshineApp);
    if (!details) {
      appsToAdd.add(sunshineApp);
    } else if (!checkExecPathMatch(execPath, details.strShortcutExe)) {
      appsToRemove.push(details);
      appsToAdd.add(sunshineApp);
    } else if (details.strDisplayName !== getEnvKeyValueString(details.strLaunchOptions, EnvVars.AppName)) {
      appsToUpdate.push(details);
    }
  }

  // Update the launch options only
  for (const details of appsToUpdate) {
    success = await updateLaunchOptions(details.unAppID, details.strDisplayName) && success;
  }

  // Check which ones are no longer in the list and needs to be removed
  for (const [name, details] of existingApps) {
    if (!sunshineApps.includes(name)) {
      appsToRemove.push(details);
    }
  }

  // Actually generate shortcuts
  const addedAppIds: Set<number> = new Set();
  for (const app of appsToAdd) {
    const appId = await addExternalShortcut(app, execPath);
    if (appId !== null) {
      addedAppIds.add(appId);
      success = await updateLaunchOptions(appId, app) && success;
    } else {
      success = false;
    }
  }

  // Remove them bastards!
  for (const details of appsToRemove) {
    success = await removeShortcut(details.unAppID) && success;
  }

  if (appsToAdd.size > 0 || appsToUpdate.length > 0 || appsToRemove.length > 0) {
    if (appsToRemove.length > 0) {
      restartSteamClient();
    } else {
      const newDetails = await getAppDetailsForAppIds(Array.from(addedAppIds));
      success = newDetails.length === addedAppIds.size && success;
      externalAppShortcuts.processAppDetails(newDetails); // Proccess details regardless of success

      if (success) {
        logger.toast(`${appsToAdd.size + appsToUpdate.length}/${sunshineApps.length} app(s) were synced.`, { output: "log" });
      } else {
        logger.toast("Some app(s) failed to sync.", { output: "error" });
      }
    }
  } else {
    logger.toast("Apps are in sync.", { output: "log" });
  }
}

export const SunshineAppsSyncButton: FC<Props> = ({ hostSettings, noConfirmationDialog }) => {
  const { connectivityManager, externalAppShortcuts } = useContext(MoonDeckContext);
  const [syncing, setSyncing] = useState(false);

  const handleClick = (): void => {
    const onOk = (): void => {
      (async () => {
        setSyncing(true);
        await syncShortcuts(
          hostSettings.hostApp.apps,
          connectivityManager.buddyProxy,
          externalAppShortcuts);
      })()
        .catch((e) => logger.critical(e))
        .finally(() => { setSyncing(false); });
    };

    if (syncing) {
      return;
    }

    if (noConfirmationDialog) {
      onOk();
      return;
    }

    showModal(
      <ConfirmModal
        strTitle="Are you sure you want to sync?"
        strDescription="This action cannot be undone."
        onOK={onOk}
      />
    );
  };

  return (
    <DialogButton disabled={syncing} onClick={() => handleClick()}>
      Sync Apps
    </DialogButton>
  );
};
