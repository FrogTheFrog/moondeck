import { BuddyStatus, ServerStatus, logger, validAbortPcStateChangeStates } from "../../lib";
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
  const { connectivityManager } = useContext(MoonDeckContext);
  const executionStatus = useCommandExecutionStatus();

  let suspendOrHibernate = null;
  if (currentHostSettings.buddy.hibernateHost) {
    suspendOrHibernate =
      <ButtonItem
        layout="below"
        disabled={executionStatus || buddyStatus !== "Online"}
        onClick={() => { connectivityManager.commandProxy.hibernatePC().catch((e) => logger.critical(e)); }}
      >
        Hibernate PC
      </ButtonItem>;
  } else {
    suspendOrHibernate =
      <ButtonItem
        layout="below"
        disabled={executionStatus || buddyStatus !== "Online"}
        onClick={() => { connectivityManager.commandProxy.suspendPC().catch((e) => logger.critical(e)); }}
      >
        Suspend PC
      </ButtonItem>;
  }

  const statusChangeCanBeAborted = validAbortPcStateChangeStates.includes(buddyStatus);
  const enableWolButton = !executionStatus && (statusChangeCanBeAborted || (serverStatus === "Offline" && buddyStatus === "Offline"));
  return (
    <PanelSection title="COMMANDS" spinner={executionStatus}>
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          bottomSeparator="none"
          disabled={!enableWolButton}
          onClick={() => {
            if (statusChangeCanBeAborted) {
              connectivityManager.commandProxy.abortPcStateChange().catch((e) => logger.critical(e));
            } else {
              connectivityManager.commandProxy.wakeOnLan().catch((e) => logger.critical(e));
            }
          }}
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
        {suspendOrHibernate}
      </PanelSectionRow>
    </PanelSection>
  );
};
