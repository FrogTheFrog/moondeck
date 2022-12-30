import { BuddyStatus, ConnectivityManager, ServerStatus, logger } from "../../lib";
import { ButtonItem, PanelSection, PanelSectionRow } from "decky-frontend-lib";
import { VFC } from "react";
import { useCommandExecutionStatus } from "../../hooks";

interface Props {
  connectivityManager: ConnectivityManager;
  serverStatus: ServerStatus;
  buddyStatus: BuddyStatus;
}

export const HostCommandPanel: VFC<Props> = ({ connectivityManager, serverStatus, buddyStatus }) => {
  const executionStatus = useCommandExecutionStatus(connectivityManager);

  return (
    <PanelSection title="COMMANDS" spinner={executionStatus}>
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          bottomSeparator="none"
          disabled={executionStatus || serverStatus === "Online" || buddyStatus === "Online"}
          onClick={() => { connectivityManager.commandProxy.wakeOnLan().catch((e) => logger.critical(e)); }}
        >
          Wake On LAN
        </ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          bottomSeparator="none"
          disabled={executionStatus || buddyStatus !== "Online"}
          onClick={() => { connectivityManager.commandProxy.restartPC().catch((e) => logger.critical(e)); }}
        >
          Restart PC
        </ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          bottomSeparator="none"
          disabled={executionStatus || buddyStatus !== "Online"}
          onClick={() => { connectivityManager.commandProxy.shutdownPC().catch((e) => logger.critical(e)); }}
        >
          Shutdown PC
        </ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          disabled={executionStatus || buddyStatus !== "Online"}
          onClick={() => { connectivityManager.commandProxy.suspendPC().catch((e) => logger.critical(e)); }}
        >
          Suspend PC
        </ButtonItem>
      </PanelSectionRow>
    </PanelSection>
  );
};
