import { DialogBody, DialogControlsSection, Field } from "decky-frontend-lib";
import { VFC, useEffect, useState } from "react";
import { BuddyPortInput } from "./buddyportinput";
import { HostOff } from "../icons";
import { LabelWithIcon } from "../shared";
import { SettingsManager } from "../../lib";
import { useCurrentHostSettings } from "../../hooks";

interface Props {
  settingsManager: SettingsManager;
}

export const HostInfoView: VFC<Props> = ({ settingsManager }) => {
  const currentHostSettings = useCurrentHostSettings(settingsManager);
  const [portValue, setPortValue] = useState<string | null>(null);

  useEffect(() => {
    if (portValue === null && currentHostSettings !== null) {
      setPortValue(`${currentHostSettings.buddyPort}`);
    }
  }, [currentHostSettings]);

  if (currentHostSettings === null) {
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
          {currentHostSettings.clientId}
        </Field>
        <Field label="GameStream client ID">
          {currentHostSettings.currentHostId}
        </Field>
        <Field label="Hostname">
          {currentHostSettings.hostName}
        </Field>
        <Field label="MAC address">
          {currentHostSettings.mac}
        </Field>
        <Field label="IP address">
          {currentHostSettings.address}
        </Field>
        <Field label="Buddy port">
          <BuddyPortInput currentHostSettings={currentHostSettings} settingsManager={settingsManager}/>
        </Field>
      </DialogControlsSection>
    </DialogBody>
  );
};
