import { BuddyStatus, ServerStatus, executeAsyncWrapper, logger, validAbortPcStateChangeStates } from "../../lib";
import { ButtonItem, PanelSection, PanelSectionRow } from "@decky/ui";
import { CurrentHostSettings, useCommandExecutionStatus } from "../../hooks";
import { FC, useContext } from "react";
import { MoonDeckContext } from "../../contexts";

interface Props {
  serverStatus: ServerStatus;
  buddyStatus: BuddyStatus;
  currentHostSettings: CurrentHostSettings;
}

export const HostCommandPanel: FC<Props> = ({ serverStatus, buddyStatus, currentHostSettings }) => {
  const { connectivityManager, moonDeckAppLauncher } = useContext(MoonDeckContext);
  const executionStatus = useCommandExecutionStatus();

  const additionalCleanup = async () => {
    try {
      await moonDeckAppLauncher.moonDeckApp.killApp(true);
      await moonDeckAppLauncher.moonDeckApp.clearApp();
    } catch (error) {
      logger.critical(error);
    }
  };

  const hibernateHost = currentHostSettings.buddy.hibernateHost;
  const statusChangeCanBeAborted = validAbortPcStateChangeStates.includes(buddyStatus);
  const enableWolButton = !executionStatus && (statusChangeCanBeAborted || (serverStatus === "Offline" && buddyStatus === "Offline"));
  return (
    <PanelSection title="COMMANDS" spinner={executionStatus}>
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          bottomSeparator="none"
          disabled={!enableWolButton}
          onClick={executeAsyncWrapper(async () => {
            if (!statusChangeCanBeAborted || !await connectivityManager.commandProxy.abortPcStateChange()) {
              await connectivityManager.commandProxy.wakeOnLan();
            }
          })}
        >
          Wake On LAN
        </ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          bottomSeparator="none"
          disabled={executionStatus || buddyStatus !== "Online"}
          onClick={executeAsyncWrapper(() => connectivityManager.commandProxy.restartPC(additionalCleanup))}
        >
          Restart PC
        </ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          bottomSeparator="none"
          disabled={executionStatus || buddyStatus !== "Online"}
          onClick={executeAsyncWrapper(() => connectivityManager.commandProxy.shutdownPC(additionalCleanup))}
        >
          Shutdown PC
        </ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          disabled={executionStatus || buddyStatus !== "Online"}
          onClick={
            executeAsyncWrapper(() => hibernateHost ?
                connectivityManager.commandProxy.hibernatePC(additionalCleanup) :
                connectivityManager.commandProxy.suspendPC(additionalCleanup))
          }
        >
          {hibernateHost ? "Hibernate PC" : "Suspend PC"}
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
};
