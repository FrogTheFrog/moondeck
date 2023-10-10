import { Field, PanelSection, PanelSectionRow } from "decky-frontend-lib";
import { ResolutionSelectionDropdown, ToggleField } from "../shared";
import { CurrentHostSettings } from "../../hooks";
import { SettingsManager } from "../../lib";
import { VFC } from "react";

interface Props {
  currentHostSettings: CurrentHostSettings | null;
  settingsManager: SettingsManager;
}

export const ResolutionPanel: VFC<Props> = ({ currentHostSettings, settingsManager }) => {
  if (currentHostSettings === null || (currentHostSettings.resolution.dimensions.length === 0 && !currentHostSettings.resolution.automatic)) {
    return null;
  }

  const hasDimensions = currentHostSettings.resolution.dimensions.length > 0;
  return (
    <PanelSection title="RESOLUTION">
      <PanelSectionRow>
        <ToggleField
          label="Pass to Moonlight"
          bottomSeparator={hasDimensions ? "none" : "standard"}
          value={currentHostSettings.resolution.passToMoonlight}
          setValue={(value) => settingsManager.updateHost((hostSettings) => { hostSettings.resolution.passToMoonlight = value; })}
        />
      </PanelSectionRow>
      {hasDimensions &&
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
    </PanelSection>
  );
};
