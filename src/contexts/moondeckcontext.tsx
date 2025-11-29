/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { AppSyncState } from "../lib/appsyncstate";
import { ConnectivityManager } from "../lib/connectivitymanager";
import { ExternalAppShortcuts } from "../lib/externalappshortcuts";
import { MoonDeckAppLauncher } from "../lib/moondeckapplauncher";
import { MoonDeckAppShortcuts } from "../lib/moondeckappshortcuts";
import { SettingsManager } from "../lib/settingsmanager";
import { createContext } from "react";

export interface MoonDeckContextType {
  appSyncState: AppSyncState;
  moonDeckAppShortcuts: MoonDeckAppShortcuts;
  externalAppShortcuts: ExternalAppShortcuts;
  settingsManager: SettingsManager;
  connectivityManager: ConnectivityManager;
  moonDeckAppLauncher: MoonDeckAppLauncher;
}

export function getDefaultContext(makeNew = false): MoonDeckContextType {
  if (typeof (getDefaultContext as any).defaultValue === "undefined") {
    makeNew = true;
    (getDefaultContext as any).defaultValue = {};
  }

  const context = (getDefaultContext as any).defaultValue as MoonDeckContextType;
  if (makeNew) {
    context.appSyncState = new AppSyncState();
    context.moonDeckAppShortcuts = new MoonDeckAppShortcuts(context.appSyncState);
    context.settingsManager = new SettingsManager();
    context.connectivityManager = new ConnectivityManager(context.settingsManager);
    context.externalAppShortcuts = new ExternalAppShortcuts(context.appSyncState, context.connectivityManager.buddyProxy, context.settingsManager);
    context.moonDeckAppLauncher = new MoonDeckAppLauncher(context.appSyncState, context.settingsManager, context.moonDeckAppShortcuts, context.externalAppShortcuts, context.connectivityManager.commandProxy);
  }
  return context;
}

export const MoonDeckContext = createContext(getDefaultContext());
