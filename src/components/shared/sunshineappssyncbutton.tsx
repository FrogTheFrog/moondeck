import { AppDetails, ConfirmModal, DialogButton, showModal } from "@decky/ui";
import { BuddyProxy, HostSettings, addShortcut, checkExecPathMatch, getAllGamestreamAppDetails, getMoonDeckRunPath, logger, removeShortcut, restartSteamClient } from "../../lib";
import { FC, useState } from "react";

interface Props {
  shortcuts?: AppDetails[];
  buddyProxy: BuddyProxy;
  hostSettings: HostSettings;
  noConfirmationDialog?: boolean;
  refreshApps?: () => void;
}

async function addExternalShortcut(appName: string, moonlightExecPath: string): Promise<number | null> {
  const appId = await addShortcut(appName, moonlightExecPath);
  if (appId == null) {
    logger.error(`Failed to add ${appName} shortcut!`);
    return null;
  }

  return appId;
}

async function syncShortcuts(shortcuts: AppDetails[], moonDeckHostApps: string[], buddyProxy: BuddyProxy, refreshApps?: () => void): Promise<void> {
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
    } else if (checkExecPathMatch(execPath, details.strShortcutExe)) {
      appsToRemove.push(details);
      appsToAdd.add(sunshineApp);
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
    success = appId !== null && success;
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

export const SunshineAppsSyncButton: FC<Props> = ({ shortcuts, buddyProxy, hostSettings, noConfirmationDialog, refreshApps }) => {
  const [syncing, setSyncing] = useState(false);

  const handleClick = (): void => {
    const onOk = (): void => {
      (async () => {
        setSyncing(true);
        await syncShortcuts(
          shortcuts ?? await getAllGamestreamAppDetails(),
          hostSettings.hostApp.apps,
          buddyProxy,
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
