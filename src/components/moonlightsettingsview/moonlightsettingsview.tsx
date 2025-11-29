import { DialogBody, DialogControlsSection, Field } from "@decky/ui";
import { AppResolutionOverrideSection } from "./appresolutionoverride/appresolutionoverridesection";
import { AudioSection } from "./audio/audiosection";
import { FC } from "react";
import { GeneralSection } from "./general/generalsection";
import { HostOff } from "../icons";
import { LabelWithIcon } from "../shared";
import { ResolutionSection } from "./resolution/resolutionsection";
import { useCurrentHostSettings } from "../../hooks";

export const MoonlightSettingsView: FC = () => {
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
      <GeneralSection hostSettings={hostSettings} />
      <AudioSection hostSettings={hostSettings} />
      <ResolutionSection hostSettings={hostSettings} />
      <AppResolutionOverrideSection hostSettings={hostSettings} />
    </DialogBody>
  );
};
