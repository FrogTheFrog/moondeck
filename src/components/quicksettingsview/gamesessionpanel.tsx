import { ButtonItem, Field, PanelSection, PanelSectionRow, Router, ToggleField } from "decky-frontend-lib";
import { MoonDeckAppData, MoonDeckAppLauncher, logger } from "../../lib";
import { VFC, useState } from "react";

interface Props {
  appData: MoonDeckAppData;
  moonDeckAppLauncher: MoonDeckAppLauncher;
}

export const GameSessionPanel: VFC<Props> = ({ appData, moonDeckAppLauncher }) => {
  const [isDisabled, setIsDisabled] = useState<boolean>(false);

  const handleNameChange = (): void => {
    setIsDisabled(true);
    moonDeckAppLauncher.moonDeckApp.changeName(!appData.sessionOptions.nameSetToAppId)
      .then((result) => { if (!result) logger.toast("Failed to change app name!", { output: "error" }); })
      .catch((e) => logger.critical(e))
      .finally(() => setIsDisabled(false));
  };

  const handleTermination = (): void => {
    setIsDisabled(true);
    Router.CloseSideMenus();
    moonDeckAppLauncher.moonDeckApp.killApp()
      .catch((e) => logger.critical(e))
      .finally(() => setIsDisabled(false));
  };

  const handleSteamClose = (): void => {
    setIsDisabled(true);
    Router.CloseSideMenus();
    moonDeckAppLauncher.moonDeckApp.closeSteamOnHost()
      .catch((e) => logger.critical(e))
      .finally(() => setIsDisabled(false));
  };

  return (
    <>
      <PanelSection title="Game Session">
        <PanelSectionRow>
          <ToggleField
            label="AppId as game title"
            disabled={isDisabled}
            checked={appData.sessionOptions.nameSetToAppId}
            onChange={() => handleNameChange()} />
        </PanelSectionRow>
      </PanelSection>
      <PanelSection title="Kill Session">
        <PanelSectionRow>
          <Field
            bottomSeparator="none"
            description="Last somewhat graceful resort for when MoonDeck or host misbehaves." />
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem
            disabled={isDisabled}
            layout="below"
            onClick={() => handleTermination()}
          >
            Exit MoonDeck runner
          </ButtonItem>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem
            disabled={isDisabled}
            layout="below"
            bottomSeparator="none"
            onClick={() => handleSteamClose()}
          >
            Close Steam on host
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    </>
  );
};
