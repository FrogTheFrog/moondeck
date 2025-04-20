import { AudioSelectionDropdown, ListDropdown } from "../../shared";
import { DialogButton, Field, ModalRoot } from "@decky/ui";
import { FC, useContext, useState } from "react";
import { HostSettings, audioOptions } from "../../../lib";
import { MoonDeckContext } from "../../../contexts";

interface Props {
  closeModal: () => void;
  devices: string[];
  hostSettings: HostSettings;
}

export const LinkedAudioModal: FC<Props> = ({ closeModal, devices, hostSettings }) => {
  const { settingsManager } = useContext(MoonDeckContext);
  const [device, setDevice] = useState<string | null>(null);
  const [option, setOption] = useState<typeof audioOptions[number] | null>(null);

  const handleClick = (): void => {
    if (device !== null && option !== null) {
      const linkedAudio = hostSettings.audio.linkedAudio;
      const newLinkedAudio: typeof linkedAudio = {};
      for (const [key, value] of Object.entries(linkedAudio)) {
        const filteredValue = value.filter((value) => value !== device);
        if (filteredValue.length > 0) {
          newLinkedAudio[key as typeof audioOptions[number]] = filteredValue;
        }
      }

      newLinkedAudio[option] = [...(newLinkedAudio[option] ?? []), device];
      settingsManager.updateHost((settings) => { settings.audio.linkedAudio = newLinkedAudio; });
    }

    closeModal();
  };

  return (
    <ModalRoot closeModal={closeModal}>
      <Field
        childrenLayout="below"
        childrenContainerWidth="max"
        bottomSeparator="none"
      >
        <ListDropdown<string>
          label="Select audio device"
          optionList={devices}
          singleItemSelection={true}
          stringifySimpleLabels={false}
          value={device}
          setValue={setDevice}
        />
      </Field>
      <Field
        childrenLayout="below"
        childrenContainerWidth="max"
        bottomSeparator="none"
      >
        <AudioSelectionDropdown
          includeNoopOption={false}
          value={option}
          setValue={setOption}
        />
      </Field>
      <Field
        childrenLayout="below"
        childrenContainerWidth="max"
        bottomSeparator="none"
      >
        <DialogButton disabled={device === null || option === null} onClick={handleClick}>
          Save link
        </DialogButton>
      </Field>
    </ModalRoot>
  );
};
