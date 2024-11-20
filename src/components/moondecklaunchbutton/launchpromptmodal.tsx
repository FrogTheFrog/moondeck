import { DialogButtonPrimary, DialogButtonSecondary, DialogHeader, Focusable, ModalRoot } from "@decky/ui";
import { VFC } from "react";
import { logger } from "../../lib";

// TODO: Remove once new Decky version comes out
enum NavEntryPositionPreferences {
  FIRST = 0,
  LAST = 1,
  MAINTAIN_X = 2,
  MAINTAIN_Y = 3,
  PREFERRED_CHILD = 4
}

interface Props {
  closeModal: () => void;
  onDone: () => void;
  launchApp: () => Promise<void>;
}

export const LaunchPromptModal: VFC<Props> = ({ closeModal, onDone, launchApp }) => {
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
