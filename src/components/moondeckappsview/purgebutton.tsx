import { AppType, logger } from "../../lib";
import { ConfirmModal, DialogButton, showModal } from "@decky/ui";
import { FC, useContext } from "react";
import { MoonDeckContext } from "../../contexts";
import { useAppSyncState } from "../../hooks";

interface Props {
  disabled: boolean;
}

export const PurgeButton: FC<Props> = ({ disabled }) => {
  const { moonDeckAppShortcuts } = useContext(MoonDeckContext);
  const syncState = useAppSyncState();

  const handleClick = (): void => {
    showModal(
      <ConfirmModal
        strTitle="Are you sure you want to purge?"
        strDescription="This action cannot be undone."
        onOK={() => { moonDeckAppShortcuts.purgeAllShortcuts().catch((e) => logger.critical(e)); }}
      />
    );
  };

  return (
    <DialogButton disabled={syncState.syncing || disabled} onClick={() => handleClick()}>
      {syncState.formatText(true, AppType.MoonDeck, "Purge")}
    </DialogButton>
  );
};
