import { DialogButton, Field, Focusable } from "@decky/ui";
import { FC, useContext } from "react";
import { FilePickerRes, FileSelectionType, openFilePicker } from "@decky/api";
import { AnyTextInput } from "../shared";
import { MoonDeckContext } from "../../contexts";
import { logger } from "../../lib";
import { useCurrentSettings } from "../../hooks";

export const PythonExecutableSection: FC = () => {
  const { settingsManager } = useContext(MoonDeckContext);
  const userSettings = useCurrentSettings();
  if (userSettings === null) {
    return null;
  }

  const browseForExec = (): void => {
    settingsManager
      .getHomeDir()
      .then((homeDir): Promise<FilePickerRes> | null => {
        if (homeDir !== null) {
          return openFilePicker(
            FileSelectionType.FILE,
            "/",
            undefined,
            undefined,
            undefined,
            undefined,
            true
          );
        }
        return null;
      })
      .then((result) => {
        if (result !== null) {
          settingsManager.update((userSettings) => {
            userSettings.pythonExecPath = result.realpath;
          });
        }
      })
      .catch((error) => logger.error(error));
  };

  return (
    <Field
      label="Custom Python executable"
      description="Some immutable distros ship with Python without tkinter, which is required for the runner to work. You can install Python via homebrew and link it here."
      childrenContainerWidth="max"
      childrenLayout="below"
    >
      <Focusable
        style={{
          display: "grid",
          gap: "10px",
          gridTemplateColumns: "1fr auto"
        }}
      >
        <AnyTextInput
          value={userSettings.pythonExecPath}
          setValue={
            (value) =>
              settingsManager.update((userSettings) => {
                userSettings.pythonExecPath = value;
              })
          }
        />
        <DialogButton
          style={{ minWidth: "initial", width: "initial" }}
          onClick={() => browseForExec()}
        >
          Browse
        </DialogButton>
      </Focusable>
    </Field>
  );
};
