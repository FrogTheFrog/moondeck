import { AppDetails, ConfirmModal, DialogButton, showModal } from "@decky/ui";
import { BuddyProxy, ControllerConfigValues, HostSettings, UserSettings, addShortcut, getAllExternalAppDetails, getMoonDeckManagedMark, logger, removeShortcut, restartSteamClient, setAppLaunchOptions, setAppResolutionOverride, updateControllerConfig } from "../../lib";
import { FC, useState } from "react";

interface Props {
  shortcuts?: AppDetails[];
  buddyProxy: BuddyProxy;
  settings: UserSettings;
  hostSettings: HostSettings;
  noConfirmationDialog?: boolean;
  refreshApps?: () => void;
}

function makeExecPath(moonlightExecPath: string | null): string {
  return moonlightExecPath === null ? "/usr/bin/flatpak" : moonlightExecPath;
}

async function addExternalShortcut(appName: string, moonlightExecPath: string): Promise<number | null> {
  const appId = await addShortcut(appName, moonlightExecPath);
  if (appId == null) {
    logger.error(`Failed to add ${appName} shortcut!`);
    return null;
  }

  return appId;
}

function makeLaunchOptions(appName: string, hostName: string, customExec: boolean): string {
  const escapedHostName = hostName.replace("'", "'\\''");
  const escapedAppName = appName.replace("'", "'\\''");
  return `${getMoonDeckManagedMark()} %command% ${customExec ? "" : "run com.moonlight_stream.Moonlight"} stream '${escapedHostName}' '${escapedAppName}'`;
}

async function updateLaunchOptions(appId: number, appName: string, hostName: string, customExec: boolean): Promise<boolean> {
  if (!await setAppLaunchOptions(appId, makeLaunchOptions(appName, hostName, customExec))) {
    logger.error(`Failed to set shortcut launch options for ${appName}!`);
    return false;
  }
  return true;
}

async function updateResolutionOverride(appId: number, appName: string, resolution: string): Promise<boolean> {
  if (!await setAppResolutionOverride(appId, resolution)) {
    logger.warn(`Failed to set app resolution override for ${appName} to ${resolution}!`);
    return false;
  }
  return true;
}

async function syncShortcuts(shortcuts: AppDetails[], moonDeckHostApps: string[], hostName: string, buddyProxy: BuddyProxy, moonlightExecPath: string | null, resOverride: string, controllerConfig: keyof typeof ControllerConfigValues, refreshApps?: () => void): Promise<void> {
  let sunshineApps = await buddyProxy.getGamestreamAppNames();
  if (sunshineApps === null) {
    logger.toast("Failed to get Gamestream app list!", { output: "error" });
    return;
  }

  if (!moonDeckHostApps.includes("MoonDeckStream")) {
    moonDeckHostApps.push("MoonDeckStream");
  }

  // Filter out the custom MoonDeck host apps
  sunshineApps = sunshineApps.filter(app => !moonDeckHostApps.includes(app));

  const existingApps = new Map<string, AppDetails>();
  for (const shortcut of shortcuts) {
    existingApps.set(shortcut.strDisplayName, shortcut);
  }

  const customExec = moonlightExecPath !== null;
  const execPath = makeExecPath(moonlightExecPath);
  const appsToAdd = new Set<string>();
  const appsToUpdate: AppDetails[] = [];
  const appsToRemove: AppDetails[] = [];
  let success = true;

  // Check which apps need to be added or updated
  for (const sunshineApp of sunshineApps) {
    const details = existingApps.get(sunshineApp);
    if (!details) {
      appsToAdd.add(sunshineApp);
    } else if (!new RegExp(`^${execPath}|"${execPath}"$`).test(details.strShortcutExe)) {
      appsToRemove.push(details);
      appsToAdd.add(sunshineApp);
    } else if (details.strShortcutLaunchOptions !== makeLaunchOptions(sunshineApp, hostName, customExec)) {
      appsToUpdate.push(details);
    }
  }

  // Check which ones are no longer in the list and needs to be removed
  for (const [name, details] of existingApps) {
    if (!sunshineApps.includes(name)) {
      appsToRemove.push(details);
    }
  }

  // Actually generate shortcuts
  for (const app of appsToAdd) {
    const appId = await addExternalShortcut(app, execPath);
    if (appId !== null) {
      success = await updateLaunchOptions(appId, app, hostName, customExec) && success;
      success = await updateResolutionOverride(appId, app, resOverride) && success;
      if (success) {
        updateControllerConfig(appId, controllerConfig);
      }
    } else {
      success = false;
    }
  }

  // Update the launch options only
  for (const details of appsToUpdate) {
    success = await updateLaunchOptions(details.unAppID, details.strDisplayName, hostName, customExec) && success;
  }

  // Remove them bastards!
  for (const details of appsToRemove) {
    success = await removeShortcut(details.unAppID) && success;
  }

  if (appsToAdd.size > 0 || appsToUpdate.length > 0 || appsToRemove.length > 0) {
    if (appsToRemove.length > 0) {
      restartSteamClient();
    } else {
      refreshApps?.();
      if (success) {
        logger.toast(`${appsToAdd.size + appsToUpdate.length}/${sunshineApps.length} app(s) were synced.`, { output: "log" });
      } else {
        logger.toast("Some app(s) failed to sync synced.", { output: "error" });
      }
    }
  } else {
    logger.toast("Apps are in sync.", { output: "log" });
  }
}

export const SunshineAppsSyncButton: FC<Props> = ({ shortcuts, buddyProxy, settings, hostSettings, noConfirmationDialog, refreshApps }) => {
  const [syncing, setSyncing] = useState(false);

  const handleClick = (): void => {
    const onOk = (): void => {
      (async () => {
        setSyncing(true);
        await syncShortcuts(
          shortcuts ?? await getAllExternalAppDetails(),
          hostSettings.hostApp.apps,
          hostSettings.hostName,
          buddyProxy,
          settings.useMoonlightExec ? settings.moonlightExecPath || null : null,
          hostSettings.sunshineApps.lastSelectedOverride,
          hostSettings.sunshineApps.lastSelectedControllerConfig,
          refreshApps);
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
