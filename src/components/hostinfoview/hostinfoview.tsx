import { DialogBody, DialogControlsSection, Field } from "@decky/ui";
import { FC } from "react";
import { HostOff } from "../icons";
import { LabelWithIcon } from "../shared";
import { useCurrentHostSettings } from "../../hooks";

export const HostInfoView: FC = () => {
  const hostSettings = useCurrentHostSettings();
  if (hostSettings === null) {
    return (
      <DialogBody>
        <DialogControlsSection>
          <Field
            label={<LabelWithIcon icon={HostOff} label="HOST IS NOT SELECTED" />}
            description="Go to host selection page to select host"
            bottomSeparator="none"
          />
        </DialogControlsSection>
      </DialogBody>
    );
  }

  return (
    <DialogBody>
      <DialogControlsSection>
        <Field label="MoonDeck client ID" focusable={true}>
          {hostSettings.clientId}
        </Field>
        <Field label="GameStream client ID" focusable={true}>
          {hostSettings.currentHostId}
        </Field>
        <Field label="Operating System" focusable={true}>
          {hostSettings.os}
        </Field>
        <Field label="Hostname" focusable={true}>
          {hostSettings.hostName}
        </Field>
        <Field label="MAC address" focusable={true}>
          {hostSettings.mac}
        </Field>
        <Field label="Address" focusable={true}>
          {hostSettings.address}
        </Field>
        <Field label="Address type" focusable={true}>
          {hostSettings.staticAddress ? "Static" : "Dynamic"}
        </Field>
        <Field label="Host info port" focusable={true}>
          {hostSettings.hostInfoPort}
        </Field>
        <Field label="Buddy port" focusable={true}>
          {hostSettings.buddy.port}
        </Field>
      </DialogControlsSection>
    </DialogBody>
  );
};
