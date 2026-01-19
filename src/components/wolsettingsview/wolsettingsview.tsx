import { DialogBody, DialogControlsSection, DialogControlsSectionHeader, Field } from "@decky/ui";
import { FC, useContext } from "react";
import { LabelWithIcon, NumericTextInput } from "../shared";
import { HostOff } from "../icons";
import { MoonDeckContext } from "../../contexts";
import { WOLExecutableSelection } from "./wolexecutableselection";
import { useCurrentHostSettings } from "../../hooks";

export const WOLSettingsView: FC = () => {
  const { settingsManager } = useContext(MoonDeckContext);
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
        <Field
          label="WOL port"
          description="Port to be used for sending out WOL request."
          childrenContainerWidth="fixed"
        >
          <NumericTextInput
            min={1}
            max={65535}
            value={hostSettings.wolSettings.port}
            setValue={(value) => { settingsManager.updateHost((settings) => { settings.wolSettings.port = value; }); }}
          />
        </Field>
      </DialogControlsSection>
    </DialogBody>
  );
};
