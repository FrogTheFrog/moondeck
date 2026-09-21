import { DialogButton, DialogControlsSection, DialogControlsSectionHeader, Field, Navigation } from "@decky/ui";
import { AppInfo } from "../../lib/externalappshortcuts";
import { FC } from "react";

interface Props {
  shortcuts: AppInfo[];
}

export const ExternalAppsShortcutList: FC<Props> = ({ shortcuts }) => {
  if (shortcuts.length === 0) {
    return null;
  }

  return (
    <DialogControlsSection>
      <DialogControlsSectionHeader>Generated Shortcuts</DialogControlsSectionHeader>
      {shortcuts.map((shortcut) => {
        return (
          <Field
            key={shortcut.appId}
            label={shortcut.appName}
            childrenContainerWidth="min"
          >
            <DialogButton onClick={() => Navigation.Navigate(`/library/app/${shortcut.appId}`)}>
              Open
            </DialogButton>
          </Field>
        );
      })}
    </DialogControlsSection>
  );
};
