import { DialogBody, DialogControlsSection, DialogControlsSectionHeader, Field } from "@decky/ui";
import { FC } from "react";
import { HostOff } from "../icons";
import { LabelWithIcon } from "../shared";
import { WOLExecutableSelection } from "./wolexecutableselection";
import { useCurrentHostSettings } from "../../hooks";

export const WOLSettingsView: FC = () => {
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
        <DialogControlsSectionHeader>General</DialogControlsSectionHeader>
        <WOLExecutableSelection hostSettings={hostSettings} />
      </DialogControlsSection>
    </DialogBody>
  );
};
