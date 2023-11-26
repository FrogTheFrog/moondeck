import { DialogButton, Field, ModalRoot } from "decky-frontend-lib";
import { VFC, useState } from "react";
import { CurrentHostSettings } from "../../hooks";
import { IndexedListDropdown } from "../shared/indexedlist";
import { ResolutionSelectionDropdown } from "../shared";
import { SettingsManager } from "../../lib";

interface Props {
  closeModal: () => void;
  displays: string[];
  hostSettings: CurrentHostSettings;
  settingsManager: SettingsManager;
}

export const LinkedDisplayModal: VFC<Props> = ({ closeModal, displays, hostSettings, settingsManager }) => {
  const [displayIndex, setDisplayIndex] = useState<number>(-1);
  const [resolutionIndex, setResolutionIndex] = useState<number>(-1);

  const handleClick = (): void => {
    const dimensions = hostSettings.resolution.dimensions;
    if (displayIndex >= 0 && displayIndex < displays.length && resolutionIndex >= 0 && resolutionIndex < dimensions.length) {
      const display = displays[displayIndex];
      for (const dimension of dimensions) {
        dimension.linkedDisplays = dimension.linkedDisplays.filter((value) => value !== display);
      }

      dimensions[resolutionIndex].linkedDisplays.push(display);
      settingsManager.updateHost((settings) => { settings.resolution.dimensions = dimensions; });
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
        <IndexedListDropdown<string>
          label="Select display"
          currentIndex={displayIndex}
          currentList={displays}
          setIndex={setDisplayIndex}
          singleItemSelection={true}
          stringifier={(value) => value}
        />
      </Field>
      <Field
        childrenLayout="below"
        childrenContainerWidth="max"
        bottomSeparator="none"
      >
        <ResolutionSelectionDropdown
          currentIndex={resolutionIndex}
          currentList={hostSettings.resolution.dimensions}
          setIndex={setResolutionIndex}
          singleItemSelection={true}
        />
      </Field>
      <Field
        childrenLayout="below"
        childrenContainerWidth="max"
        bottomSeparator="none"
      >
        <DialogButton disabled={displayIndex < 0 || resolutionIndex < 0} onClick={handleClick}>
          Save link
        </DialogButton>
      </Field>
    </ModalRoot>
  );
};
