import { DialogControlsSection, DialogControlsSectionHeader, Field } from "@decky/ui";
import { FC, useContext } from "react";
import { HostSettings } from "../../../lib";
import { MoonDeckContext } from "../../../contexts";
import { MoonlightExecutableSelection } from "./moonlightexecutableselection";
import { BooleanSelectionDropdown, ToggleField, VideoCodecSelectionDropdown } from "../../shared";

interface Props {
  hostSettings: HostSettings;
}

export const GeneralSection: FC<Props> = ({ hostSettings }) => {
  const { settingsManager } = useContext(MoonDeckContext);

  return (
    <DialogControlsSection>
      <DialogControlsSectionHeader>General</DialogControlsSectionHeader>
      <MoonlightExecutableSelection />
      <ToggleField
        label="Pass audio, resolution and other options to Moonlight to use instead of Moonlight's default ones"
        description="Disable this if you want to use the settings from the Moonlight app itself"
        value={hostSettings.passToMoonlight}
        setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.passToMoonlight = value; })}
      />
      <Field
        label="Video codec (optional)"
        description="Codec to be applied when starting stream. Don't override option will use the codec selected in Moonlight's settings."
        childrenContainerWidth="fixed"
      >
        <VideoCodecSelectionDropdown
          value={hostSettings.videoCodec}
          setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.videoCodec = value; })}
        />
      </Field>
      <Field
        label="Enable v-sync when streaming"
        description="Enable or disable v-sync during streaming. Don't override option will use the option selected in Moonlight's settings."
        childrenContainerWidth="fixed"
      >
        <BooleanSelectionDropdown
          includeNoopOption={true}
          value={hostSettings.enableVSync!}
          defaultText="Select v-sync option"
          setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.enableVSync = value; })}
        />
      </Field>
      <Field
        label="Enable frame pacing when streaming"
        description="Enable or disable frame pacing during streaming. Don't override option will use the option selected in Moonlight's settings."
        childrenContainerWidth="fixed"
      >
        <BooleanSelectionDropdown
          includeNoopOption={true}
          value={hostSettings.enableFramePacing!}
          defaultText="Select frame pacing option"
          setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.enableFramePacing = value; })}
        />
      </Field>
      <Field
        label="Show performance stats when streaming"
        description="Show or hide performance stats during streaming. Don't override option will use the option selected in Moonlight's settings."
        childrenContainerWidth="fixed"
      >
        <BooleanSelectionDropdown
          includeNoopOption={true}
          value={hostSettings.showPerformanceStats!}
          defaultText="Select show performance option"
          setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.showPerformanceStats = value; })}
        />
      </Field>
    </DialogControlsSection>
  );
};
