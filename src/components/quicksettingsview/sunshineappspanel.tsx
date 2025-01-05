import { BuddyProxy, UserSettings } from "../../lib";
import { Field, PanelSection, PanelSectionRow } from "@decky/ui";
import { CurrentHostSettings } from "../../hooks";
import { FC } from "react";
import { SunshineAppsSyncButton } from "../shared";

interface Props {
  buddyProxy: BuddyProxy;
  currentHostSettings: CurrentHostSettings | null;
  currentSettings: UserSettings | null;
}

export const SunshineAppsPanel: FC<Props> = ({ buddyProxy, currentHostSettings, currentSettings }) => {
  if (currentHostSettings === null || currentSettings === null) {
    return null;
  }

  if (!currentHostSettings.sunshineApps.showQuickAccessButton) {
    return null;
  }

  return (
    <PanelSection title="SUNSHINE APPS">
      <PanelSectionRow>
        <Field
          childrenContainerWidth="fixed"
          spacingBetweenLabelAndChild="none"
        >
          <SunshineAppsSyncButton buddyProxy={buddyProxy} settings={currentSettings} hostSettings={currentHostSettings} noConfirmationDialog={true} />
        </Field>
      </PanelSectionRow>
    </PanelSection>
  );
};
