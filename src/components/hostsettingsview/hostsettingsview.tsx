import { DialogBody, DialogControlsSection, DialogControlsSectionHeader, Field } from "decky-frontend-lib";
import { LabelWithIcon, NumericTextInput, ResolutionSelectionDropdown, ToggleField } from "../shared";
import { AddResolutionButton } from "./addresolutionbutton";
import { HostOff } from "../icons";
import { ResolutionForgetButton } from "./resolutionforgetbutton";
import { SettingsManager } from "../../lib";
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
          label="Pass the resolution to Moonlight to use instead of default"
          description="I honestly don't know why I added option to disable this. Might be useful to someone... It's your choice :)"
          value={hostSettings.resolution.passToMoonlight}
          setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.resolution.passToMoonlight = value; })}
        />
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
          label="Selected resolution"
          childrenContainerWidth="fixed"
          description="Select the custom resolution to use."
        >
          <ResolutionSelectionDropdown
            currentIndex={hostSettings.resolution.selectedDimensionIndex}
            currentList={hostSettings.resolution.dimensions}
            setIndex={(value) => { settingsManager.updateHost((hostSettings) => { hostSettings.resolution.selectedDimensionIndex = value; }); }}
          />
        </Field>
        <Field
          label="Forget selected resolution"
          childrenContainerWidth="fixed"
        >
          <ResolutionForgetButton
            currentIndex={hostSettings.resolution.selectedDimensionIndex}
            currentList={hostSettings.resolution.dimensions}
            updateResolution={(list, index) => {
              settingsManager.updateHost((hostSettings) => {
                hostSettings.resolution.dimensions = list;
                hostSettings.resolution.selectedDimensionIndex = index;
              });
            }}
          />
        </Field>
        <Field
          label="Add custom resolution"
          childrenContainerWidth="fixed"
        >
          <AddResolutionButton
            currentList={hostSettings.resolution.dimensions}
            updateResolution={(list, index) => {
              settingsManager.updateHost((hostSettings) => {
                hostSettings.resolution.dimensions = list;
                hostSettings.resolution.selectedDimensionIndex = index;
              });
            }}
          />
        </Field>
      </DialogControlsSection>
    </DialogBody>
  );
};
