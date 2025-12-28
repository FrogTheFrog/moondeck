import { DialogControlsSection, DialogControlsSectionHeader } from "@decky/ui";
import { FC, useContext } from "react";
import { HostSettings } from "../../../lib";
import { MoonDeckContext } from "../../../contexts";
import { MoonlightExecutableSelection } from "./moonlightexecutableselection";
import { ToggleField } from "../../shared";

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
      <ToggleField
        label="Show performance stats when streaming"
        description="Enable this to show performance stats during streaming"
        value={hostSettings.showPerformanceStats}
        setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.showPerformanceStats = value; })}
      />
    </DialogControlsSection>
  );
};
