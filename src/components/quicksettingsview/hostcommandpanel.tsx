import { BuddyStatus, ServerStatus, logger } from "../../lib";
import { ButtonItem, PanelSection, PanelSectionRow } from "@decky/ui";
import { FC, useContext } from "react";
import { MoonDeckContext } from "../../contexts";
import { useCommandExecutionStatus } from "../../hooks";

interface Props {
  serverStatus: ServerStatus;
  buddyStatus: BuddyStatus;
}

export const HostCommandPanel: FC<Props> = ({ serverStatus, buddyStatus }) => {
  const { connectivityManager } = useContext(MoonDeckContext);
  const executionStatus = useCommandExecutionStatus();

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
