import { Field, PanelSection, PanelSectionRow } from "@decky/ui";
import { CurrentHostSettings } from "../../hooks";
import { FC } from "react";
import { SunshineAppsSyncButton } from "../shared";

interface Props {
  currentHostSettings: CurrentHostSettings | null;
}

export const SunshineAppsPanel: FC<Props> = ({ currentHostSettings }) => {
  if (currentHostSettings === null) {
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
          <SunshineAppsSyncButton hostSettings={currentHostSettings} noConfirmationDialog={true} />
        </Field>
      </PanelSectionRow>
    </PanelSection>
  );
};
