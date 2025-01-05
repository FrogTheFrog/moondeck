import { Field, PanelSection, PanelSectionRow } from "@decky/ui";
import { SettingsManager, UserSettings } from "../../lib";
import { CurrentHostSettings } from "../../hooks";
import { FC } from "react";
import { HostAppSelectionDropdown } from "../shared";

interface Props {
  currentSettings: UserSettings | null;
  currentHostSettings: CurrentHostSettings | null;
  settingsManager: SettingsManager;
}

export const HostAppPanel: FC<Props> = ({ currentSettings, currentHostSettings, settingsManager }) => {
  if (currentSettings === null || currentHostSettings === null) {
    return null;
  }

  if (!currentSettings.enableMoondeckShortcuts || currentHostSettings.hostApp.apps.length < 2) {
    return null;
  }

  return (
    <PanelSection title="STREAMING APP NAME">
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
