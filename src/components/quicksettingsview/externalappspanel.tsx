import { Field, PanelSection, PanelSectionRow } from "@decky/ui";
import { AppType } from "../../lib";
import { CurrentHostSettings } from "../../hooks";
import { ExternalAppsSyncButton } from "../shared";
import { FC } from "react";

interface Props {
  currentHostSettings: CurrentHostSettings | null;
}

export const ExternalAppsPanel: FC<Props> = ({ currentHostSettings }) => {
  if (currentHostSettings === null) {
    return null;
  }

  let nonSteamView = null;
  if (currentHostSettings.nonSteamApps.showQuickAccessButton) {
    nonSteamView =
      <PanelSectionRow>
        <Field
          childrenContainerWidth="fixed"
          spacingBetweenLabelAndChild="none"
        >
          <ExternalAppsSyncButton text="Sync Non-Steam Apps" appType={AppType.NonSteam} noConfirmationDialog={true} />
        </Field>
      </PanelSectionRow>;
  }

  let gameStreamView = null;
  if (currentHostSettings.gameStreamApps.showQuickAccessButton) {
    gameStreamView =
      <PanelSectionRow>
        <Field
          childrenContainerWidth="fixed"
          spacingBetweenLabelAndChild="none"
          bottomSeparator={nonSteamView ? "none" : "standard"}
        >
          <ExternalAppsSyncButton text="Sync GameStream Apps" appType={AppType.GameStream} noConfirmationDialog={true} />
        </Field>
      </PanelSectionRow>;
  }

  if (!gameStreamView && !nonSteamView) {
    return null;
  }

  return (
    <PanelSection title="EXTERNAL APPS">
      {gameStreamView}
      {nonSteamView}
    </PanelSection>
  );
};
