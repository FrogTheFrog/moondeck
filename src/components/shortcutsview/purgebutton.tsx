import { ConfirmModal, DialogButton, showModal } from "decky-frontend-lib";
import { ShortcutManager, logger } from "../../lib";
import { VFC } from "react";

interface Props {
  disabled: boolean;
  shortcutManager: ShortcutManager;
}

export const PurgeButton: VFC<Props> = ({ disabled, shortcutManager }) => {
  const handleClick = (): void => {
    showModal(
      <ConfirmModal
        strTitle="Are you sure you want to purge?"
        strDescription="This action cannot be undone."
        onOK={() => { shortcutManager.purgeAllShortcuts().catch((e) => logger.critical(e)); }}
      />
    ).catch((e) => logger.critical(e));
  };

  return (
    <DialogButton disabled={disabled} onClick={() => handleClick()}>
      Purge
    </DialogButton>
  );
};
