import { DialogBody, DialogControlsSection, DialogControlsSectionHeader, Field, Focusable } from "decky-frontend-lib";
import { HostAppSelectionDropdown, LabelWithIcon, NumericTextInput, ResolutionSelectionDropdown, ToggleField } from "../shared";
import { ModifyListButton, RemoveListEntryButton } from "../shared/indexedlist";
import { SettingsManager, maxBitrate, minBitrate } from "../../lib";
import { AppResolutionOverrideDropdown } from "./appresolutionoverridedropdown";
import { HostOff } from "../icons";
import { ModifyHostAppModal } from "./modifyhostappmodal";
import { ModifyResolutionModal } from "./modifyresolutionmodal";
import { VFC } from "react";
import { useCurrentHostSettings } from "../../hooks";

interface Props {
  settingsManager: SettingsManager;
}

export const HostSettingsView: VFC<Props> = ({ settingsManager }) => {
  const hostSettings = useCurrentHostSettings(settingsManager);
  if (hostSettings === null) {
    return (
      <DialogBody>
        <DialogControlsSection>
          <Field
            label={<LabelWithIcon icon={HostOff} label="HOST IS NOT SELECTED" />}
            description="Go to host selection page to select host"
            bottomSeparator="none" />
        </DialogControlsSection>
      </DialogBody>
    );
  }

  return (
    <DialogBody>
      <DialogControlsSection>
        <DialogControlsSectionHeader>General</DialogControlsSectionHeader>
        <Field label="MoonDeck client ID" focusable={true}>
          {hostSettings.clientId}
        </Field>
        <Field label="GameStream client ID" focusable={true}>
          {hostSettings.currentHostId}
        </Field>
        <Field label="Hostname" focusable={true}>
          {hostSettings.hostName}
        </Field>
        <Field label="MAC address" focusable={true}>
          {hostSettings.mac}
        </Field>
        <Field label="IP address" focusable={true}>
          {hostSettings.address}
        </Field>
        <Field label="IP address type" focusable={true}>
          {hostSettings.staticAddress ? "Static" : "Dynamic"}
        </Field>
        <Field label="Buddy port" childrenContainerWidth="fixed">
          <NumericTextInput
            min={1}
            max={65535}
            value={hostSettings.buddyPort}
            setValue={(value) => { settingsManager.updateHost((hostSettings) => { hostSettings.buddyPort = value; }); }}
          />
        </Field>
        <ToggleField
          label="Automatically close Steam on host when gaming session ends"
          description={
            <>
              <div>If disabled, Steam will remain open in bigpicture mode (no way to leave bigpicture without closing Steam without using the UI).</div>
              <br />
              <div>Note: Nvidia Gamestream somehow closes the OLD bigpicture mode. Seems to be a bug.</div>
            </>
          }
          value={hostSettings.closeSteamOnceSessionEnds}
          setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.closeSteamOnceSessionEnds = value; })}
        />
      </DialogControlsSection>
      <DialogControlsSection>
        <DialogControlsSectionHeader>Gamestream App</DialogControlsSectionHeader>
        <Field
          description={
            <>
              <div>This is the app that will be used by MoonDeck when starting gamestream.</div>
              <br />
              <div>Can be customized to have some specific "do/undo" logic on the host.</div>
              <br />
              <div>If the list is empty, the MoonDeckStream name is used by default.</div>
            </>
          }
          focusable={true}
        />
        <Field
          label="Selected app name"
          childrenContainerWidth="fixed"
          bottomSeparator="none"
        >
          <HostAppSelectionDropdown
            currentIndex={hostSettings.hostApp.selectedAppIndex}
            currentList={hostSettings.hostApp.apps}
            setIndex={(value) => { settingsManager.updateHost((hostSettings) => { hostSettings.hostApp.selectedAppIndex = value; }); }}
          />
        </Field>
        <Field
          childrenContainerWidth="fixed"
          childrenLayout="below"
        >
          <Focusable style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <ModifyListButton
              modal={ModifyHostAppModal}
              currentList={hostSettings.hostApp.apps}
              currentIndex={null}
              updateList={(list, index) => {
                settingsManager.updateHost((hostSettings) => {
                  hostSettings.hostApp.apps = list;
                  hostSettings.hostApp.selectedAppIndex = index;
                });
              }}
            />
            <ModifyListButton
              modal={ModifyHostAppModal}
              currentList={hostSettings.hostApp.apps}
              currentIndex={hostSettings.hostApp.selectedAppIndex}
              updateList={(list, index) => {
                settingsManager.updateHost((hostSettings) => {
                  hostSettings.hostApp.apps = list;
                  hostSettings.hostApp.selectedAppIndex = index;
                });
              }}
            />
            <RemoveListEntryButton
              currentList={hostSettings.hostApp.apps}
              currentIndex={hostSettings.hostApp.selectedAppIndex}
              updateList={(list, index) => {
                settingsManager.updateHost((hostSettings) => {
                  hostSettings.hostApp.apps = list;
                  hostSettings.hostApp.selectedAppIndex = index;
                });
              }}
            />
          </Focusable>
        </Field>
      </DialogControlsSection>
      <DialogControlsSection>
        <DialogControlsSectionHeader>Custom Resolution</DialogControlsSectionHeader>
        <Field
          description={
            <>
              <div>Here you can define custom resolution which is used by MoonDeck to enhance gaming experience.</div>
              <br />
              <div>See the sections below this one for more information for where it can be used.</div>
            </>
          }
          focusable={true}
        />
        <ToggleField
          label="Use SteamDeck's primary resolution as fallback"
          description="If custom resolution is disabled, SteamDeck's primary resolution will be used - that of internal or external display."
          value={hostSettings.resolution.automatic}
          setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.resolution.automatic = value; })}
        />
        <ToggleField
          label="Use custom resolution from the list"
          description="This setting has no effect if the custom resolution list is empty."
          value={hostSettings.resolution.useCustomDimensions}
          setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.resolution.useCustomDimensions = value; })}
        />
        <Field
          label="Default bitrate in kbps (optional)"
          description="Bitrate to be applied when starting stream. Will be overridden by the one from custom resolution if provided."
          childrenContainerWidth="fixed"
          bottomSeparator="none"
        >
          <NumericTextInput
            min={minBitrate}
            max={maxBitrate}
            optional={true}
            value={hostSettings.resolution.defaultBitrate}
            setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.resolution.defaultBitrate = value; })}
          />
        </Field>
        <Field
          label="Selected custom resolution"
          childrenContainerWidth="fixed"
          bottomSeparator="none"
        >
          <ResolutionSelectionDropdown
            currentIndex={hostSettings.resolution.selectedDimensionIndex}
            currentList={hostSettings.resolution.dimensions}
            setIndex={(value) => { settingsManager.updateHost((hostSettings) => { hostSettings.resolution.selectedDimensionIndex = value; }); }}
          />
        </Field>
        <Field
          childrenContainerWidth="fixed"
          childrenLayout="below"
        >
          <Focusable style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <ModifyListButton
              modal={ModifyResolutionModal}
              currentList={hostSettings.resolution.dimensions}
              currentIndex={null}
              updateList={(list, index) => {
                settingsManager.updateHost((hostSettings) => {
                  hostSettings.resolution.dimensions = list;
                  hostSettings.resolution.selectedDimensionIndex = index;
                });
              }}
            />
            <ModifyListButton
              modal={ModifyResolutionModal}
              currentList={hostSettings.resolution.dimensions}
              currentIndex={hostSettings.resolution.selectedDimensionIndex}
              updateList={(list, index) => {
                settingsManager.updateHost((hostSettings) => {
                  hostSettings.resolution.dimensions = list;
                  hostSettings.resolution.selectedDimensionIndex = index;
                });
              }}
            />
            <RemoveListEntryButton
              currentList={hostSettings.resolution.dimensions}
              currentIndex={hostSettings.resolution.selectedDimensionIndex}
              updateList={(list, index) => {
                settingsManager.updateHost((hostSettings) => {
                  hostSettings.resolution.dimensions = list;
                  hostSettings.resolution.selectedDimensionIndex = index;
                });
              }}
            />
          </Focusable>
        </Field>
      </DialogControlsSection>
      <DialogControlsSection>
        <DialogControlsSectionHeader>Gamestream Resolution</DialogControlsSectionHeader>
        <Field
          description="Here you can specify how to use custom resolution for the gamestream."
          focusable={true}
        />
        <ToggleField
          label="Pass the resolution option to Buddy to change resolution on host PC"
          description="Disable this if you want to use do/undo commands for changing resolution"
          value={hostSettings.resolution.passToBuddy}
          setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.resolution.passToBuddy = value; })}
        />
        <ToggleField
          label="Pass the resolution and bitrate options to Moonlight to use instead of default ones"
          description="Disable this if you want to use the settings from the Moonlight app itself"
          value={hostSettings.resolution.passToMoonlight}
          setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.resolution.passToMoonlight = value; })}
        />
      </DialogControlsSection>
      <DialogControlsSection>
        <DialogControlsSectionHeader>App Resolution Override</DialogControlsSectionHeader>
        <Field
          description={
            <>
              <div>Sets the app shortcut resolution property which informs the Gamescope on how to perform scaling.</div>
              <br />
              <div>Note: this applies ONLY for the external displays (technically you can enable it for internal display too, but we don't do it).</div>
            </>
          }
          bottomSeparator="none"
          focusable={true}
        />
        <Field
          description={
            <>
              <div>The following options are available:</div>
              <div>&bull; "Custom Resolution" (MoonDeck's default) - if custom resolution is enabled and selected, it will be used for scaling.</div>
              <div>&bull; "Display Resolution" - will use the resolution of the primary display for scaling.</div>
              <div>&bull; "Native" - technically should be the same as "Display Resolution", however one user reported that it still performs some unnecessary scaling once the stream starts.</div>
              <div>&bull; "Default" - this is the Valve's default scaling option. It is just bad...</div>
              <br />
              <div>If for whatever reason MoonDeck fails to retrieve either a custom resolution (because it's disabled) or the display resolution, the following fallback chain will ensure that at least something is set:</div>
              <div>"Custom Resolution" -&gt; "Display Resolution" -&gt; "Native"</div>
            </>
          }
          focusable={true}
        />
        <Field
          label="Selected override"
          childrenContainerWidth="fixed"
        >
          <AppResolutionOverrideDropdown
            currentOverride={hostSettings.resolution.appResolutionOverride}
            setOverride={(value) => { settingsManager.updateHost((hostSettings) => { hostSettings.resolution.appResolutionOverride = value; }); }}
          />
        </Field>
      </DialogControlsSection>
    </DialogBody>
  );
};
