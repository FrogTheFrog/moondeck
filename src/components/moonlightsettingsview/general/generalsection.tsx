import { BooleanSelectionDropdown, ToggleField, VideoCodecSelectionDropdown } from "../../shared";
import { DialogControlsSection, DialogControlsSectionHeader, Field } from "@decky/ui";
import { FC, useContext } from "react";
import { HostSettings } from "../../../lib";
import { MoonDeckContext } from "../../../contexts";
import { MoonlightExecutableSelection } from "./moonlightexecutableselection";

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
        label="Video codec"
        description="Codec to use when streaming. Current Moonlight setting will be used unless overriden."
        childrenContainerWidth="fixed"
      >
        <VideoCodecSelectionDropdown
          value={hostSettings.videoCodec}
          setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.videoCodec = value; })}
        />
      </Field>
      <Field
        label="Toggle V-sync"
        description="V-sync option to use when streaming. Current Moonlight setting will be used unless overriden."
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
        label="Toggle frame pacing"
        description="Frame pacing option to use when streaming. Current Moonlight setting will be used unless overriden."
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
        label="Toggle performance stats"
        description="Show or hide performance stats when streaming. Current Moonlight setting will be used unless overriden."
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
