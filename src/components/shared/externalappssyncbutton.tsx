import { ConfirmModal, DialogButton, showModal } from "@decky/ui";
import { FC, useContext } from "react";
import { ExternalAppType } from "../../lib/externalappshortcuts";
import { MoonDeckContext } from "../../contexts";
import { logger } from "../../lib";
import { useExternalAppsSyncing } from "../../hooks";

interface Props {
  text: string;
  appType: ExternalAppType;
  noConfirmationDialog?: boolean;
}

export const ExternalAppsSyncButton: FC<Props> = ({ text, appType, noConfirmationDialog }) => {
  const { externalAppShortcuts } = useContext(MoonDeckContext);
  const syncing = useExternalAppsSyncing();

  const handleClick = (): void => {
    const onOk = (): void => {
      externalAppShortcuts.syncShortcuts(appType).catch((e) => logger.critical(e));
    };

    if (syncing) {
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
    <DialogButton disabled={syncing !== null} onClick={() => handleClick()}>
      {syncing !== null && (!syncing.purge && syncing.appType === appType) ? `${syncing.current}/${syncing.max}` : text}
    </DialogButton>
  );
};
