import { ButtonItem, Navigation, PanelSection, PanelSectionRow } from "decky-frontend-lib";
import { VFC } from "react";

export const GoToSettingsPanel: VFC<unknown> = () => {
  return (
    <PanelSection>
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={() => { Navigation.CloseSideMenus(); Navigation.Navigate("/moondeck"); }}>
          Go to Settings
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
};
