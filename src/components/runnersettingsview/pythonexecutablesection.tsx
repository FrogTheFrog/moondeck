import { AnyTextInput, ToggleField } from "../shared";
import { DialogButton, Field, Focusable } from "@decky/ui";
import { FilePickerRes, FileSelectionType, openFilePicker } from "@decky/api";
import { SettingsManager, logger } from "../../lib";
import { useCurrentSettings } from "../../hooks";

interface Props {
  settingsManager: SettingsManager;
}

export const PythonExecutableSection: React.FC<Props> = ({
  settingsManager
}) => {
  const userSettings = useCurrentSettings(settingsManager);

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
            `${homeDir}`,
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
    <>
      <ToggleField
        label="Use custom Python executable"
        description="Some distros ship with Python without tkinter, which is required for the runner to work. You can install Python via homebrw and link it here."
        bottomSeparator="none"
        value={userSettings.usePythonExec}
        setValue={(value) =>
          settingsManager.update((userSettings) => {
            userSettings.usePythonExec = value;
          })
        }
      />

      <Field childrenContainerWidth="max" childrenLayout="below">
        <Focusable
          style={{
            display: "grid",
            gap: "10px",
            gridTemplateColumns: "1fr auto"
          }}
        >
          <AnyTextInput
            disabled={!userSettings.usePythonExec}
            value={userSettings.pythonExecPath}
            setValue={(value) =>
              settingsManager.update((userSettings) => {
                userSettings.pythonExecPath = value;
              })
            }
          />
          <DialogButton
            style={{ minWidth: "initial", width: "initial" }}
            disabled={!userSettings.usePythonExec}
            focusable={userSettings.usePythonExec}
            onClick={() => browseForExec()}
          >
            Browse
          </DialogButton>
        </Focusable>
      </Field>
    </>
  );
};
