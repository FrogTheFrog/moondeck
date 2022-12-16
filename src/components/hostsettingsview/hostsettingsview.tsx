import { DialogBody, DialogControlsSection, DialogControlsSectionHeader, Field } from "decky-frontend-lib";
import { LabelWithIcon, NumbericTextInput, ToggleField } from "../shared";
import { HostOff } from "../icons";
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
          <NumbericTextInput
            min={1}
            max={65535}
            value={hostSettings.buddyPort}
            setValue={(value) => { settingsManager.updateHost((hostSettings) => { hostSettings.buddyPort = value; }); }}
          />
        </Field>
      </DialogControlsSection>
      <DialogControlsSection>
      <DialogControlsSectionHeader>Resolution</DialogControlsSectionHeader>
        <Field
          description={
            <>
              <div>GameStream can refuse Moonlight's request for a specific resolution when streaming Steam, but with Buddy we can try to change it ourselves!</div>
              <br />
              <div>The host PC must support the resolution, otherwise nothing will happen and whatever resolution is set by GameStream will be used.</div>
              <br />
              <div>Works most of the time...</div>
            </>
          }
          focusable={true}
        />
        <ToggleField
          label="Try to apply SteamDeck's resolution on host PC"
          description="If for some reason SteamDeck's resolution info could not be acquired, will use custom resolution as fallback (if enabled)."
          value={hostSettings.resolution.automatic}
          setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.resolution.automatic = value; })}
        />
        <ToggleField
          label="Ask Buddy to change resolution ASAP"
          description="Depending on various conditions, Buddy may ignore the request. In such cases, the Steam window on host may look stretched out."
          value={hostSettings.resolution.earlyChangeEnabled}
          setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.resolution.earlyChangeEnabled = value; })}
        />
        <ToggleField
          label="Pass the resolution to Moonlight to use instead of default"
          description="I honestly don't know why I added option to disable this. Might be useful to someone... It's your choice :)"
          value={hostSettings.resolution.passToMoonlight}
          setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.resolution.passToMoonlight = value; })}
        />
        <ToggleField
          label="Try to apply custom resolution on host PC"
          value={hostSettings.resolution.useCustomDimensions}
          setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.resolution.useCustomDimensions = value; })}
        />
        <Field label="Custom width" childrenContainerWidth="fixed">
          <NumbericTextInput
            min={0}
            value={hostSettings.resolution.customWidth}
            setValue={(value) => { settingsManager.updateHost((hostSettings) => { hostSettings.resolution.customWidth = value; }); }}
          />
        </Field>
        <Field label="Custom height" childrenContainerWidth="fixed">
          <NumbericTextInput
            min={0}
            value={hostSettings.resolution.customHeight}
            setValue={(value) => { settingsManager.updateHost((hostSettings) => { hostSettings.resolution.customHeight = value; }); }}
          />
        </Field>
      </DialogControlsSection>
    </DialogBody>
  );
};
