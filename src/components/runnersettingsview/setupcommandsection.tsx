import { DialogButton, Field, Focusable } from "@decky/ui";
import { FC, useContext } from "react";
import { FilePickerRes, FileSelectionType, openFilePicker } from "@decky/api";
import { AnyTextInput } from "../shared";
import { MoonDeckContext } from "../../contexts";
import { logger } from "../../lib";
import { useCurrentSettings } from "../../hooks";

export const SetupCommandSection: FC = () => {
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
            userSettings.setupCommand = `'${result.realpath.replace(/'/g, "'\\''")}'`;
          });
        }
      })
      .catch((error) => logger.error(error));
  };

  return (
    <Field
      label="Setup command"
      description="Command, script or program run before WOL and starting stream. The runner waits for it to finish and aborts if it fails."
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
          value={userSettings.setupCommand}
          setValue={
            (value) =>
              settingsManager.update((userSettings) => {
                userSettings.setupCommand = value;
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
