import { DialogBody, DialogControlsSection, Field } from "decky-frontend-lib";
import { HostOff } from "../icons";
import { LabelWithIcon } from "./labelwithicon";
import { VFC } from "react";

export const SettingsLoadingField: VFC<unknown> = () => {
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
