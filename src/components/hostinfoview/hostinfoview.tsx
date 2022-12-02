import { DialogBody, DialogControlsSection, Field } from "decky-frontend-lib";
import { LabelWithIcon, NumbericTextInput } from "../shared";
import { HostOff } from "../icons";
import { SettingsManager } from "../../lib";
import { VFC } from "react";
import { useCurrentHostSettings } from "../../hooks";

interface Props {
  settingsManager: SettingsManager;
}

export const HostInfoView: VFC<Props> = ({ settingsManager }) => {
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
        <Field label="MoonDeck client ID">
          {hostSettings.clientId}
        </Field>
        <Field label="GameStream client ID">
          {hostSettings.currentHostId}
        </Field>
        <Field label="Hostname">
          {hostSettings.hostName}
        </Field>
        <Field label="MAC address">
          {hostSettings.mac}
        </Field>
        <Field label="IP address">
          {hostSettings.address}
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
    </DialogBody>
  );
};
