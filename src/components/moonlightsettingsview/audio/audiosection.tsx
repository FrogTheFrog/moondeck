import { DialogControlsSection, DialogControlsSectionHeader, Field } from "@decky/ui";
import { FC, useContext } from "react";
import { HostSettings, audioOptions } from "../../../lib";
import { LinkedAudioList } from "./linkedaudiolist";
import { ListDropdown } from "../../shared";
import { MoonDeckContext } from "../../../contexts";

interface Props {
  hostSettings: HostSettings;
}

export const AudioSection: FC<Props> = ({ hostSettings }) => {
  const { settingsManager } = useContext(MoonDeckContext);

  return (
    <DialogControlsSection>
      <DialogControlsSectionHeader>Audio</DialogControlsSectionHeader>
      <Field
        label="Default audio setting"
        description="Audio setting to be used when starting stream."
        childrenContainerWidth="fixed"
      >
        <ListDropdown
          optionList={audioOptions}
          label="Don't override"
          withOptionalValue={true}
          value={hostSettings.audio.defaultOption}
          setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.audio.defaultOption = value; })}
        />
      </Field>
      <LinkedAudioList hostSettings={hostSettings} />
    </DialogControlsSection>
  );
};
