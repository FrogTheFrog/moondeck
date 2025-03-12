import { ConfirmModal, DialogButton, showModal } from "@decky/ui";
import { FC, useContext } from "react";
import { MoonDeckContext } from "../../contexts";
import { logger } from "../../lib";

interface Props {
  disabled: boolean;
}

export const PurgeButton: FC<Props> = ({ disabled }) => {
  const { moonDeckAppShortcuts } = useContext(MoonDeckContext);
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
    <DialogButton disabled={disabled} onClick={() => handleClick()}>
      Purge
    </DialogButton>
  );
};
