import { AppDetails, DialogBody, DialogButton, DialogControlsSection, DialogControlsSectionHeader, Field, Navigation } from "@decky/ui";
import { BuddyProxy, SettingsManager, getAllExternalAppDetails, logger } from "../../lib";
import { FC, ReactNode, useEffect, useState } from "react";
import { LabelWithIcon, SunshineAppsSyncButton, ToggleField } from "../shared";
import { useCurrentHostSettings, useCurrentSettings } from "../../hooks";
import { BatchResOverrideButton } from "./batchresoverridebutton";
import { ControllerConfigButton } from "./controllerconfigbutton";
import { HostOff } from "../icons";
import { PurgeButton } from "./purgebutton";

interface Props {
  settingsManager: SettingsManager;
  buddyProxy: BuddyProxy;
}

export const SunshineAppsView: FC<Props> = ({ settingsManager, buddyProxy }) => {
  const settings = useCurrentSettings(settingsManager);
  const hostSettings = useCurrentHostSettings(settingsManager);
  const [shortcuts, setShortcuts] = useState<AppDetails[]>([]);

  const refreshApps = (): void => {
    (async () => {
      let data = await getAllExternalAppDetails();
      data = data.sort((a, b) => a.strDisplayName < b.strDisplayName ? -1 : a.strDisplayName > b.strDisplayName ? 1 : 0);
      setShortcuts(data);
    })().catch((e) => logger.critical(e));
  };

  useEffect(refreshApps, []);

  let syncButton: ReactNode = null;
  if (settings == null || hostSettings === null) {
    syncButton =
      <DialogControlsSection>
        <DialogControlsSectionHeader>Sync with Buddy</DialogControlsSectionHeader>
        <Field
          label={<LabelWithIcon icon={HostOff} label="HOST IS NOT SELECTED" />}
          description="Go to host selection page to select host"
          bottomSeparator="none" />
      </DialogControlsSection>;
  } else {
    syncButton =
      <DialogControlsSection>
        <DialogControlsSectionHeader>Sync with Buddy</DialogControlsSectionHeader>
        <Field
          label="Sync all Sunshine's apps via Buddy"
          description="Steam client might be restarted afterwards!"
          childrenContainerWidth="fixed"
        >
          <SunshineAppsSyncButton shortcuts={shortcuts} buddyProxy={buddyProxy} settings={settings} hostSettings={hostSettings} refreshApps={refreshApps} />
        </Field>
        <ToggleField
          label="Show button in Quick Access Menu"
          description="Confirmation dialog will not be displayed when using it!"
          value={hostSettings.sunshineApps.showQuickAccessButton}
          setValue={(value) => settingsManager.updateHost((settings) => { settings.sunshineApps.showQuickAccessButton = value; })}
        />
      </DialogControlsSection>;
  }

  let shortcutsList: ReactNode = null;
  if (shortcuts.length > 0) {
    shortcutsList =
      <DialogControlsSection>
        <DialogControlsSectionHeader>Generated Shortcuts</DialogControlsSectionHeader>
        {shortcuts.map((shortcut) => {
          return (
            <Field
              key={shortcut.unAppID}
              label={shortcut.strDisplayName}
              childrenContainerWidth="min"
            >
              <DialogButton onClick={() => Navigation.Navigate(`/library/app/${shortcut.unAppID}`)}>
                Open
              </DialogButton>
            </Field>
          );
        })}
      </DialogControlsSection>;
  }

  let controllerConfigButton: ReactNode = null;
  if (hostSettings) {
    controllerConfigButton =
      <DialogControlsSection>
        <DialogControlsSectionHeader>External controller Steam Input</DialogControlsSectionHeader>
        <Field
          description={
            <>
              <div>Choose which Steam Input option to use for the external controllers.</div>
              <br />
              <div>Disabling Steam Input is preferable in most cases as the Moonlight can then see the actual controller instead of a generic XBox one that Steam exposes.</div>
              <br />
              <div>This means that the motion data becomes available for PS4/Dualsense controllers and the rumble works better in most cases.</div>
            </>
          }
          focusable={true}
        />
        <Field
          label="Selected Steam Input option"
          childrenContainerWidth="fixed"
        >
          <ControllerConfigButton hostSettings={hostSettings} shortcuts={shortcuts} settingsManager={settingsManager} />
        </Field>
      </DialogControlsSection>;
  }

  let batchResOverrideButton: ReactNode = null;
  if (hostSettings) {
    batchResOverrideButton =
      <DialogControlsSection>
        <DialogControlsSectionHeader>App Resolution Override</DialogControlsSectionHeader>
        <Field
          description={
            <>
              <div>If you are planning on using external display, you probably need to use this.</div>
              <div>Steam shortcut's resolution property needs to be set for all Sunshine apps to match the Moonlight client resolution.</div>
              <div>Otherwise the gamescope may try to apply scaling and you might get a blurry text/image.</div>
              <br />
              <div>Note: this is already automatically done for MoonDeck-Steam apps, for synced Sunshine apps you must do it manually.</div>
            </>
          }
          focusable={true}
        />
        <Field
          label="Select and apply resolution"
          childrenContainerWidth="fixed"
          description={
            <>
              Override for newly added apps (last used): {hostSettings.sunshineApps.lastSelectedOverride}
            </>
          }
        >
          <BatchResOverrideButton hostSettings={hostSettings} shortcuts={shortcuts} settingsManager={settingsManager} />
        </Field>
      </DialogControlsSection>;
  }

  return (
    <DialogBody>
      <DialogControlsSection>
        <DialogControlsSectionHeader>What are the Sunshine Apps?</DialogControlsSectionHeader>
        <Field
          description={
            <>
              <div>These are the non-Steam shortcuts generated by MoonDeck from Sunshine's app list.</div>
              <div>Buddy needs to be configured to access the app list, otherwise this feature will not work!</div>
              <br />
              <div>Sunshine apps will not be supported by MoonDeck in any way apart from manually syncing them.</div>
              <div>This means no automatic resolution change or anything else!</div>
              <br />
              <div>These shortcuts are host-sensitive - if you change the hostname, they might no longer work!</div>
              <div>In this case you can re-sync. If the names do not change, only the launch options will be updated and artwork will remain.</div>
            </>
          }
          focusable={true}
        />
      </DialogControlsSection>
      <DialogControlsSection>
        <DialogControlsSectionHeader>Cleanup</DialogControlsSectionHeader>
        <Field
          label="Purge all generated shortcuts!"
          description="Steam client might be restarted afterwards!"
          childrenContainerWidth="fixed"
        >
          <PurgeButton shortcuts={shortcuts} />
        </Field>
      </DialogControlsSection>
      {syncButton}
      {controllerConfigButton}
      {batchResOverrideButton}
      {shortcutsList}
    </DialogBody>
  );
};
