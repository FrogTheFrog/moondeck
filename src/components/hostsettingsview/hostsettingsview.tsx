import { DialogBody, DialogControlsSection, DialogControlsSectionHeader, Field, Focusable } from "decky-frontend-lib";
import { HostAppSelectionDropdown, LabelWithIcon, NumericTextInput, ResolutionSelectionDropdown, ToggleField } from "../shared";
import { ModifyListButton, RemoveListEntryButton } from "../shared/indexedlist";
import { SettingsManager, maxBitrate, minBitrate } from "../../lib";
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
        <DialogControlsSectionHeader>Resolution</DialogControlsSectionHeader>
        <Field
          description={
            <>
              <div>GameStream can refuse Moonlight's request for a specific resolution when streaming, but with Buddy we can try to change it ourselves!</div>
              <br />
              <div>The host PC must support the resolution, otherwise nothing will happen and whatever resolution is set by GameStream will be used.</div>
              <br />
              <div>Works most of the time...</div>
            </>
          }
          focusable={true}
        />
        <ToggleField
          label="Pass the resolution and bitrate options to Moonlight to use instead of default ones"
          description="I honestly don't know why I added option to disable this. Might be useful to someone... It's your choice :)"
          value={hostSettings.resolution.passToMoonlight}
          setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.resolution.passToMoonlight = value; })}
        />
        <Field
          label="Bitrate in kbps (optional)"
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
        <ToggleField
          label="Try to apply SteamDeck's resolution on host PC"
          description="If custom resolution is disabled, will try to get SteamDeck's internal resolution."
          value={hostSettings.resolution.automatic}
          setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.resolution.automatic = value; })}
        />
        <ToggleField
          label="Try to apply custom resolution on host PC"
          description="This setting has no effect if the custom resolution list is empty."
          value={hostSettings.resolution.useCustomDimensions}
          setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.resolution.useCustomDimensions = value; })}
        />
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
    </DialogBody>
  );
};
