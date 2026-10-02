import { DialogButton, DialogControlsSection, DialogControlsSectionHeader, Field, Focusable, Navigation } from "@decky/ui";
import { FC, useEffect, useState } from "react";
import { AnyTextInput } from "./anytextinput";
import { AppInfo } from "../../lib/externalappshortcuts";
import { ClearMain } from "../icons";
import { executeAsync } from "../../lib";

interface Props {
  shortcuts: AppInfo[];
}

function mockFilterShortcuts<T extends AppInfo>(filterInput: string, shortcuts: T[]): Promise<T[]> {
  const normalized = filterInput.trim().toLowerCase();
  if (normalized === "") {
    return Promise.resolve(shortcuts);
  }

  return Promise.resolve(shortcuts.filter((shortcut) => shortcut.appName.toLowerCase().includes(normalized)));
}

export const ExternalAppsShortcutList: FC<Props> = ({ shortcuts }) => {
  const [filterInput, setFilterInput] = useState<string>("");
  const [filteredShortcuts, setFilteredShortcuts] = useState<AppInfo[]>(shortcuts);

  useEffect(() => {
    let cancelled = false;
    executeAsync(async () => {
      const result = await mockFilterShortcuts(filterInput, shortcuts);
      if (!cancelled) {
        setFilteredShortcuts(result);
      }
    });

    return () => { cancelled = true; };
  }, [filterInput, shortcuts]);

  if (shortcuts.length === 0) {
    return null;
  }

  return (
    <DialogControlsSection>
      <DialogControlsSectionHeader>Generated Shortcuts</DialogControlsSectionHeader>
      <Field
        label="Filter"
        childrenContainerWidth="fixed"
      >
        <Focusable style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ flex: "1" }}>
            <AnyTextInput
              value={filterInput}
              setValue={setFilterInput}
            />
          </div>
          <DialogButton
            disabled={filterInput === ""}
            onClick={() => setFilterInput("")}
            style={{ minWidth: "auto", fontSize: "14px", lineHeight: "16px", padding: "10px 12px" }}
          >
            <ClearMain />
          </DialogButton>
        </Focusable>
      </Field>
      {filteredShortcuts.map((shortcut) => {
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
