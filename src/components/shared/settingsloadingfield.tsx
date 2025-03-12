import { DialogBody, DialogControlsSection, Field } from "@decky/ui";
import { FC } from "react";
import { HostOff } from "../icons";
import { LabelWithIcon } from "./labelwithicon";

export const SettingsLoadingField: FC = () => {
  return (
    <DialogBody>
      <DialogControlsSection>
        <Field
          label={<LabelWithIcon icon={HostOff} label="SETTINGS ARE STILL BEING LOADED" />}
          description="Please wait or check the logs for exceptions!"
          bottomSeparator="none" />
      </DialogControlsSection>
    </DialogBody>
  );
};
