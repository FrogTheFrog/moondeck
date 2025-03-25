import { FC, useContext } from "react";
import { Field, PanelSection, PanelSectionRow } from "@decky/ui";
import { CurrentHostSettings } from "../../hooks";
import { HostAppSelectionDropdown } from "../shared";
import { MoonDeckContext } from "../../contexts";
import { UserSettings } from "../../lib";

interface Props {
  currentSettings: UserSettings | null;
  currentHostSettings: CurrentHostSettings | null;
}

export const HostAppPanel: FC<Props> = ({ currentSettings, currentHostSettings }) => {
  const { settingsManager } = useContext(MoonDeckContext);

  if (currentSettings === null || currentHostSettings === null) {
    return null;
  }

  if (!currentSettings.enableMoondeckShortcuts || currentHostSettings.buddy.hostApp.apps.length < 2) {
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
            currentIndex={currentHostSettings.buddy.hostApp.selectedAppIndex}
            currentList={currentHostSettings.buddy.hostApp.apps}
            setIndex={(value) => { settingsManager.updateHost((hostSettings) => { hostSettings.buddy.hostApp.selectedAppIndex = value; }); }}
          />
        </Field>
      </PanelSectionRow>
    </PanelSection>
  );
};
