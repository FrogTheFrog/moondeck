import { DialogButtonPrimary, DialogButtonSecondary, DialogHeader, Focusable, ModalRoot, NavEntryPositionPreferences } from "@decky/ui";
import { FC } from "react";
import { logger } from "../../lib";

interface Props {
  closeModal: () => void;
  onDone: () => void;
  launchApp: () => Promise<void>;
}

export const LaunchPromptModal: FC<Props> = ({ closeModal, onDone, launchApp }) => {
  const handleDismiss = (): void => {
    closeModal();
    onDone();
  };

  const handleLaunch = (): void => {
    closeModal();
    launchApp().catch((e) => logger.critical(e)).finally(() => onDone());
  };

  return (
    <ModalRoot closeModal={handleDismiss}>
      <DialogHeader style={{ marginBottom: "1em" }}>
        Would you like to launch MoonDeck stream?
      </DialogHeader>
      <Focusable
        style={{ display: "flex", justifyContent: "flex-end", gap: "1em" }}
        navEntryPreferPosition={NavEntryPositionPreferences.LAST}
      >
        <DialogButtonPrimary onClick={handleLaunch}>Yes</DialogButtonPrimary>
        <DialogButtonSecondary onClick={handleDismiss}>No</DialogButtonSecondary>
      </Focusable>
    </ModalRoot>
  );
};
