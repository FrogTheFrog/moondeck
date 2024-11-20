import { AppDetails, DialogBody, DialogButton, DialogControlsSection, DialogControlsSectionHeader, Field, Navigation } from "@decky/ui";
import { ReactNode, VFC, useEffect, useState } from "react";
import { SettingsManager, ShortcutManager, getAllMoonDeckAppDetails, logger } from "../../lib";
import { useCurrentSettings, useShortcutManagerState } from "../../hooks";
import { PurgeButton } from "./purgebutton";
import { ToggleField } from "../shared";

interface Props {
  settingsManager: SettingsManager;
  shortcutManager: ShortcutManager;
}

export const ShortcutsView: VFC<Props> = ({ settingsManager, shortcutManager }) => {
  const isReady = useShortcutManagerState(shortcutManager);
  const [shortcuts, setShortcuts] = useState<AppDetails[]>([]);
  const currentSettings = useCurrentSettings(settingsManager);

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
        <Field description="These shortcuts are exposed here for debugging purposes mostly. Any changes you make here could break something or could be just discarded." />
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
      {currentSettings !== null &&
        <DialogControlsSection>
          <ToggleField
            label="Enable the MoonDeck shortcuts"
            description="Disabling this will remove the MoonDeck button!"
            value={currentSettings.enableMoondeckShortcuts}
            setValue={(value) => settingsManager.update((settings) => { settings.enableMoondeckShortcuts = value; })}
          />
          <ToggleField
            label="Enable confirmation prompt dialog for starting the stream"
            description="In case you misclick a lot, you might want to enable this to prevent accidental streams."
            value={currentSettings.enableMoondeckButtonPrompt}
            setValue={(value) => settingsManager.update((settings) => { settings.enableMoondeckButtonPrompt = value; })}
          />
        </DialogControlsSection>
      }
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
