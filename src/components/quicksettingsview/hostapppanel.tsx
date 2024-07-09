import { Field, PanelSection, PanelSectionRow } from "@decky/ui";
import { CurrentHostSettings } from "../../hooks";
import { HostAppSelectionDropdown } from "../shared";
import { SettingsManager } from "../../lib";
import { VFC } from "react";

interface Props {
  currentHostSettings: CurrentHostSettings | null;
  settingsManager: SettingsManager;
}

export const HostAppPanel: VFC<Props> = ({ currentHostSettings, settingsManager }) => {
  if (currentHostSettings === null || currentHostSettings.hostApp.apps.length < 2) {
    return null;
  }

  return (
    <PanelSection title="APP NAME">
      <PanelSectionRow>
        <Field
          childrenContainerWidth="fixed"
          spacingBetweenLabelAndChild="none"
        >
          <HostAppSelectionDropdown
            currentIndex={currentHostSettings.hostApp.selectedAppIndex}
            currentList={currentHostSettings.hostApp.apps}
            setIndex={(value) => { settingsManager.updateHost((hostSettings) => { hostSettings.hostApp.selectedAppIndex = value; }); }}
          />
        </Field>
      </PanelSectionRow>
    </PanelSection>
  );
};
