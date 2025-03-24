import { ConfirmModal, DialogButton, showModal } from "@decky/ui";
import { FC, useContext } from "react";
import { ExternalAppType } from "../../lib/externalappshortcuts";
import { MoonDeckContext } from "../../contexts";
import { logger } from "../../lib";
import { useAppSyncState } from "../../hooks";

interface Props {
  appType: ExternalAppType;
  disabled: boolean;
}

export const ExternalAppsPurgeButton: FC<Props> = ({ appType, disabled }) => {
  const { externalAppShortcuts } = useContext(MoonDeckContext);
  const syncState = useAppSyncState();

  const handleClick = (): void => {
    showModal(
      <ConfirmModal
        strTitle="Are you sure you want to purge?"
        strDescription="This action cannot be undone."
        onOK={() => { externalAppShortcuts.purgeShortcuts(appType).catch((e) => logger.critical(e)); }}
      />
    );
  };

  return (
    <DialogButton disabled={syncState.syncing || disabled} onClick={() => handleClick()}>
      {syncState.formatText(true, appType, "Purge")}
    </DialogButton>
  );
};
