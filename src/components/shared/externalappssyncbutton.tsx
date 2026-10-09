import { AppType, logger } from "../../lib";
import { ConfirmModal, DialogButton, showModal } from "@decky/ui";
import { FC, useContext } from "react";
import { useAppSyncState, useServerStatus } from "../../hooks";
import { ExternalAppType } from "../../lib/externalappshortcuts";
import { MoonDeckContext } from "../../contexts";

interface Props {
  text: string;
  appType: ExternalAppType;
  noConfirmationDialog?: boolean;
}

export const ExternalAppsSyncButton: FC<Props> = ({ text, appType, noConfirmationDialog }) => {
  const { externalAppShortcuts } = useContext(MoonDeckContext);
  const syncState = useAppSyncState();
  const [serverStatus] = useServerStatus();

  const handleClick = (): void => {
    const onOk = (): void => {
      if (serverStatus === "Offline" && appType === AppType.GameStream) {
        // Querying for gamestream apps may wake up host (as opposed to querying Buddy). Let's avoid that...
        logger.toast("GameStream server is offline!", { output: "error" });
        return;
      }

      externalAppShortcuts.syncShortcuts(appType).catch((e) => logger.critical(e));
    };

    if (syncState.syncing) {
      return;
    }

    if (noConfirmationDialog) {
      onOk();
      return;
    }

    showModal(
      <ConfirmModal
        strTitle="Are you sure you want to sync?"
        strDescription="This action cannot be undone."
        onOK={onOk}
      />
    );
  };

  return (
    <DialogButton disabled={syncState.syncing} onClick={() => handleClick()}>
      {syncState.formatText(false, appType, text)}
    </DialogButton>
  );
};
