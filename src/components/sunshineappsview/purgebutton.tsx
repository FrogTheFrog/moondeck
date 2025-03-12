import { ConfirmModal, DialogButton, showModal } from "@decky/ui";
import { logger, removeShortcut, restartSteamClient } from "../../lib";
import { FC } from "react";
import { GameStreamAppInfo } from "../../hooks";

interface Props {
  shortcuts: GameStreamAppInfo[];
}

async function purgeShortcuts(shortcuts: GameStreamAppInfo[]): Promise<void> {
  for (const info of shortcuts) {
    await removeShortcut(info.appId);
  }

  if (shortcuts.length > 0) {
    restartSteamClient();
  }
}

export const PurgeButton: FC<Props> = ({ shortcuts }) => {
  const handleClick = (): void => {
    showModal(
      <ConfirmModal
        strTitle="Are you sure you want to purge?"
        strDescription="This action cannot be undone."
        onOK={() => { purgeShortcuts(shortcuts).catch((e) => logger.critical(e)); }}
      />
    );
  };

  return (
    <DialogButton disabled={shortcuts.length === 0} onClick={() => handleClick()}>
      Purge
    </DialogButton>
  );
};
