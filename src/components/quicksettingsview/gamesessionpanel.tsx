import { AppType, MoonDeckAppData, logger } from "../../lib";
import { ButtonItem, Field, Navigation, PanelSection, PanelSectionRow, ToggleField } from "@decky/ui";
import { FC, useContext, useState } from "react";
import { MoonDeckContext } from "../../contexts";

interface Props {
  appData: MoonDeckAppData;
}

export const GameSessionPanel: FC<Props> = ({ appData }) => {
  const { moonDeckAppLauncher } = useContext(MoonDeckContext);
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
    Navigation.CloseSideMenus();
    moonDeckAppLauncher.moonDeckApp.killApp()
      .catch((e) => logger.critical(e))
      .finally(() => setIsDisabled(false));
  };

  const handleSteamClose = (): void => {
    setIsDisabled(true);
    Navigation.CloseSideMenus();
    moonDeckAppLauncher.moonDeckApp.closeSteamOnHost()
      .catch((e) => logger.critical(e))
      .finally(() => setIsDisabled(false));
  };

  if (appData.appType === AppType.MoonDeck) {
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
              bottomSeparator="none"
              onClick={() => handleTermination()}
            >
              Exit MoonDeck runner
            </ButtonItem>
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem
              disabled={isDisabled}
              layout="below"
              onClick={() => handleSteamClose()}
            >
              Close Steam on host
            </ButtonItem>
          </PanelSectionRow>
        </PanelSection>
      </>
    );
  }

  return (
    <>
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
            bottomSeparator="none"
            onClick={() => handleTermination()}
          >
            Exit MoonDeck runner
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    </>
  );
};
