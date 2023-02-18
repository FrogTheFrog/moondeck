import { AppDetails, DialogBody, DialogButton, DialogControlsSection, DialogControlsSectionHeader, Field, Navigation } from "decky-frontend-lib";
import { ReactNode, VFC, useEffect, useState } from "react";
import { ShortcutManager, getAllMoonDeckAppDetails, logger } from "../../lib";
import { PurgeButton } from "./purgebutton";
import { useShortcutManagerState } from "../../hooks";

interface Props {
  shortcutManager: ShortcutManager;
}

export const ShortcutsView: VFC<Props> = ({ shortcutManager }) => {
  const isReady = useShortcutManagerState(shortcutManager);
  const [shortcuts, setShortcuts] = useState<AppDetails[]>([]);

  useEffect(() => {
    if (isReady) {
      (async () => {
        let data = await getAllMoonDeckAppDetails();
        data = data.sort((a, b) => a.strDisplayName < b.strDisplayName ? -1 : a.strDisplayName > b.strDisplayName ? 1 : 0);
        setShortcuts(data);
      })().catch((e) => logger.critical(e));
    } else {
      setShortcuts([]);
    }
  }, [isReady]);

  let shortcutsList: ReactNode = null;
  if (isReady && shortcuts.length > 0) {
    shortcutsList =
      <DialogControlsSection>
        <DialogControlsSectionHeader>Shortcuts</DialogControlsSectionHeader>
        <Field description="These shortcuts are exposed here for debugging purposes mostly. Any changes you make here could break something or could be just discarded."/>
        {shortcuts.map((shortcut) => {
          return (
            <Field
              key={shortcut.unAppID}
              label={shortcut.strDisplayName}
              childrenContainerWidth="min"
            >
              <DialogButton onClick={() => Navigation.Navigate(`/library/app/${shortcut.unAppID}`)}>
                Open
              </DialogButton>
            </Field>
          );
        })}
      </DialogControlsSection>;
  }

  return (
    <DialogBody>
      <DialogControlsSection>
        <DialogControlsSectionHeader>Cleanup</DialogControlsSectionHeader>
        <Field
          label="Purge all the MoonDeck shortcuts!"
          description="Steam client will be restarted afterwards!"
          childrenContainerWidth="fixed"
        >
          <PurgeButton disabled={!isReady || shortcuts.length === 0} shortcutManager={shortcutManager} />
        </Field>
      </DialogControlsSection>
      {shortcutsList}
    </DialogBody>
  );
};
