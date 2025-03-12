import { AnyTextInput, ToggleField } from "../shared";
import { DialogButton, Field, Focusable } from "@decky/ui";
import { FC, useContext } from "react";
import { FilePickerRes, FileSelectionType, openFilePicker } from "@decky/api";
import { MoonDeckContext } from "../../contexts";
import { logger } from "../../lib";
import { useCurrentSettings } from "../../hooks";

export const MoonlightExecutableSelection: FC = () => {
  const { settingsManager } = useContext(MoonDeckContext);
  const userSettings = useCurrentSettings();
  if (userSettings === null) {
    return null;
  }

  const browseForExec = (): void => {
    settingsManager.getHomeDir().then((homeDir): Promise<FilePickerRes> | null => {
      if (homeDir !== null) {
        return openFilePicker(FileSelectionType.FILE, `${homeDir}/Downloads`);
      }
      return null;
    }).then((result) => {
      if (result !== null) {
        settingsManager.update((userSettings) => { userSettings.moonlightExecPath = result.realpath; });
      }
    }).catch((error) => logger.error(error));
  };

  return (
    <>
      <ToggleField
        label="Use custom Moonlight executable"
        description="Use provided executable instead of Flatpak version"
        bottomSeparator="none"
        value={userSettings.useMoonlightExec}
        setValue={(value) => settingsManager.update((userSettings) => { userSettings.useMoonlightExec = value; })}
      />
      <Field
        childrenContainerWidth="max"
        childrenLayout="below"
      >
        <Focusable style={{ display: "grid", gap: "10px", gridTemplateColumns: "1fr auto" }}>
          <AnyTextInput
            disabled={!userSettings.useMoonlightExec}
            value={userSettings.moonlightExecPath}
            setValue={(value) => settingsManager.update((userSettings) => { userSettings.moonlightExecPath = value; })}
          />
          <DialogButton
            style={{ minWidth: "initial", width: "initial" }}
            disabled={!userSettings.useMoonlightExec}
            focusable={userSettings.useMoonlightExec}
            onClick={() => browseForExec()}
          >
            Browse
          </DialogButton>
        </Focusable>
      </Field>
    </>
  );
};
