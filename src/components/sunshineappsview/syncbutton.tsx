import { AppDetails, ConfirmModal, DialogButton, showModal } from "decky-frontend-lib";
import { BuddyProxy, addShortcut, getMoonDeckManagedMark, logger, removeShortcut, restartSteamClient, setAppLaunchOptions } from "../../lib";
import { VFC } from "react";

interface Props {
  shortcuts: AppDetails[];
  moonDeckHostApps: string[];
  hostName: string;
  buddyProxy: BuddyProxy;
  refreshApps: () => void;
}

async function addExternalShortcut(appName: string): Promise<number | null> {
  const appId = await addShortcut(appName, "/usr/bin/flatpak");
  if (appId == null) {
    logger.error(`Failed to add ${appName} shortcut!`);
    return null;
  }

  return appId;
}

function makeLaunchOptions(appName: string, hostName: string): string {
  return `${getMoonDeckManagedMark()} %command% run com.moonlight_stream.Moonlight stream ${hostName} "${appName}"`;
}

async function updateLaunchOptions(appId: number, appName: string, hostName: string): Promise<void> {
  if (!await setAppLaunchOptions(appId, makeLaunchOptions(appName, hostName))) {
    logger.error(`Failed to set shortcut launch options for ${appName}!`);
  }
}

async function syncShortcuts(shortcuts: AppDetails[], moonDeckHostApps: string[], hostName: string, buddyProxy: BuddyProxy, refreshApps: () => void): Promise<void> {
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

  const appsToAdd = new Set<string>();
  const appsToUpdate: AppDetails[] = [];
  const appsToRemove: AppDetails[] = [];

  // Check which apps need to be added or updated
  for (const sunshineApp of sunshineApps) {
    const details = existingApps.get(sunshineApp);
    if (!details) {
      appsToAdd.add(sunshineApp);
    } else if (details.strShortcutLaunchOptions !== makeLaunchOptions(sunshineApp, hostName)) {
      appsToUpdate.push(details);
    }
  }

  // Check which ones are no longer in the list and needs to be returned
  for (const [name, details] of existingApps) {
    if (!sunshineApps.includes(name)) {
      appsToRemove.push(details);
    }
  }

  // Actually generate shortcuts
  for (const app of appsToAdd) {
    const appId = await addExternalShortcut(app);
    if (appId !== null) {
      await updateLaunchOptions(appId, app, hostName);
    }
  }

  // Update the launch options only
  for (const details of appsToUpdate) {
    await updateLaunchOptions(details.unAppID, details.strDisplayName, hostName);
  }

  // Remove them bastards!
  for (const details of appsToRemove) {
    await removeShortcut(details.unAppID);
  }

  if (appsToAdd.size > 0 || appsToUpdate.length > 0 || appsToRemove.length > 0) {
    if (appsToRemove.length > 0) {
      restartSteamClient();
    } else {
      refreshApps();
      logger.toast(`${appsToAdd.size + appsToUpdate.length}/${sunshineApps.length} app(s) were synced.`, { output: "log" });
    }
  } else {
    logger.toast("Apps are in sync.", { output: "log" });
  }
}

export const SyncButton: VFC<Props> = ({ shortcuts, moonDeckHostApps, hostName, buddyProxy, refreshApps }) => {
  const handleClick = (): void => {
    showModal(
      <ConfirmModal
        strTitle="Are you sure you want to sync?"
        strDescription="This action cannot be undone."
        onOK={() => { syncShortcuts(shortcuts, moonDeckHostApps, hostName, buddyProxy, refreshApps).catch((e) => logger.critical(e)); }}
      />
    );
  };

  return (
    <DialogButton onClick={() => handleClick()}>
      Sync
    </DialogButton>
  );
};
