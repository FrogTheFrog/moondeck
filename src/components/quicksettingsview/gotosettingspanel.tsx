import { ButtonItem, PanelSection, PanelSectionRow, Router } from "decky-frontend-lib";
import { VFC } from "react";

export const GoToSettingsPanel: VFC<unknown> = () => {
  return (
    <PanelSection>
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={() => { Router.CloseSideMenus(); Router.Navigate("/moondeck"); }}>
          Go to Settings
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
};
