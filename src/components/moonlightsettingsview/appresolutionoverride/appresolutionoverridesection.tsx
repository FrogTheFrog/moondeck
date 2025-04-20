import { DialogControlsSection, DialogControlsSectionHeader, Field } from "@decky/ui";
import { FC, useContext } from "react";
import { AppResolutionOverrideDropdown } from "./appresolutionoverridedropdown";
import { HostSettings } from "../../../lib";
import { MoonDeckContext } from "../../../contexts";
import { ToggleField } from "../../shared";

interface Props {
  hostSettings: HostSettings;
}

export const AppResolutionOverrideSection: FC<Props> = ({ hostSettings }) => {
  const { settingsManager } = useContext(MoonDeckContext);

  return (
    <DialogControlsSection>
      <DialogControlsSectionHeader>App Resolution Override</DialogControlsSectionHeader>
      <Field
        description={
          <>
            <div>Sets the app shortcut resolution property which informs the Gamescope on how to perform scaling.</div>
            <br />
            <div>The following options are available:</div>
            <div>&bull; "Custom Resolution" (MoonDeck's default) - if custom resolution is enabled and selected, it will be used for scaling.</div>
            <div>&bull; "Display Resolution" - will use the resolution of the primary display for scaling.</div>
            <div>&bull; "Native" - technically should be the same as "Display Resolution", however one user reported that it still performs some unnecessary scaling once the stream starts.</div>
            <div>&bull; "Default" - this is the Valve's default scaling option. It is just bad...</div>
            <br />
            <div>If for whatever reason MoonDeck fails to retrieve either a custom resolution (because it's disabled) or the display resolution, the following fallback chain will ensure that at least something is set:</div>
            <div>"Custom Resolution" -&gt; "Display Resolution" -&gt; "Native"</div>
          </>
        }
        focusable={true}
      />
      <Field
        label="Selected override"
        childrenContainerWidth="fixed"
      >
        <AppResolutionOverrideDropdown
          currentOverride={hostSettings.resolution.appResolutionOverride}
          setOverride={(value) => { settingsManager.updateHost((hostSettings) => { hostSettings.resolution.appResolutionOverride = value; }); }}
        />
      </Field>
      <ToggleField
        label="Also apply to internal display"
        description="By default the override is for external displays only, but this can be changed with this option."
        value={hostSettings.resolution.appResolutionOverrideForInternalDisplay}
        setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.resolution.appResolutionOverrideForInternalDisplay = value; })}
      />
    </DialogControlsSection>
  );
};
