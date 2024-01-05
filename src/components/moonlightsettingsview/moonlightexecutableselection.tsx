import { AnyTextInput, ToggleField } from "../shared";
import { DialogButton, Field, FilePickerRes, FileSelectionType, Focusable, ServerAPI } from "decky-frontend-lib";
import { SettingsManager, logger } from "../../lib";
import { VFC } from "react";
import { useCurrentSettings } from "../../hooks";

interface Props {
  serverAPI: ServerAPI;
  settingsManager: SettingsManager;
}

export const MoonlightExecutableSelection: VFC<Props> = ({ serverAPI, settingsManager }) => {
  const userSettings = useCurrentSettings(settingsManager);
  if (userSettings === null) {
    return null;
  }

  const browseForExec = (): void => {
    settingsManager.getHomeDir().then((homeDir): Promise<FilePickerRes> | null => {
      if (homeDir !== null) {
        return serverAPI.openFilePickerV2(FileSelectionType.FILE, `${homeDir}/Downloads`);
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
