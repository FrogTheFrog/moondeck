import { CurrentHostSettings, useCurrentDisplayIdentifier } from "../../hooks";
import { FC, useContext } from "react";
import { Field, PanelSection, PanelSectionRow } from "@decky/ui";
import { ResolutionSelectionDropdown, ToggleField } from "../shared";
import { MoonDeckContext } from "../../contexts";
import { UserSettings } from "../../lib";

interface Props {
  currentSettings: UserSettings | null;
  currentHostSettings: CurrentHostSettings | null;
}

export const ResolutionPanel: FC<Props> = ({ currentSettings, currentHostSettings }) => {
  const { settingsManager } = useContext(MoonDeckContext);

  if (currentSettings === null || currentHostSettings === null) {
    return null;
  }

  if (currentHostSettings.resolution.dimensions.length === 0) {
    return null;
  }

  const display = useCurrentDisplayIdentifier();
  const isLinkedDisplay = ((): boolean => {
    if (display !== null) {
      for (const dimension of currentHostSettings.resolution.dimensions) {
        if (dimension.linkedDisplays.includes(display)) {
          return true;
        }
      }
    }
    return false;
  })();
  const showCustomResolution = !isLinkedDisplay || !currentHostSettings.resolution.useLinkedDisplays;

  return (
    <PanelSection title="RESOLUTION">
      <>
        <PanelSectionRow>
          <ToggleField
            label="Enable linked displays"
            bottomSeparator={showCustomResolution ? "none" : "standard"}
            value={currentHostSettings.resolution.useLinkedDisplays}
            setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.resolution.useLinkedDisplays = value; })}
          />
        </PanelSectionRow>
        {showCustomResolution &&
          <>
            <PanelSectionRow>
              <ToggleField
                label="Enable custom resolution"
                bottomSeparator="none"
                value={currentHostSettings.resolution.useCustomDimensions}
                setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.resolution.useCustomDimensions = value; })}
              />
            </PanelSectionRow>
            <PanelSectionRow>
              <Field
                childrenContainerWidth="fixed"
                spacingBetweenLabelAndChild="none"
              >
                <ResolutionSelectionDropdown
                  focusable={currentHostSettings.resolution.dimensions.length > 1}
                  currentIndex={currentHostSettings.resolution.selectedDimensionIndex}
                  currentList={currentHostSettings.resolution.dimensions}
                  setIndex={(value) => { settingsManager.updateHost((hostSettings) => { hostSettings.resolution.selectedDimensionIndex = value; }); }}
                />
              </Field>
            </PanelSectionRow>
          </>
        }
      </>
    </PanelSection>
  );
};
