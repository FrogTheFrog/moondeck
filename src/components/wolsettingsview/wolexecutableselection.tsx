import { AnyTextInput, ToggleField } from "../shared";
import { DialogButton, Field, Focusable } from "@decky/ui";
import { FC, useContext } from "react";
import { FilePickerRes, FileSelectionType, openFilePicker } from "@decky/api";
import { HostSettings, logger } from "../../lib";
import { MoonDeckContext } from "../../contexts";

interface Props {
  hostSettings: HostSettings;
}

export const WOLExecutableSelection: FC<Props> = ({ hostSettings }) => {
  const { settingsManager } = useContext(MoonDeckContext);

  const browseForExec = (): void => {
    settingsManager.getHomeDir().then((homeDir): Promise<FilePickerRes> | null => {
      if (homeDir !== null) {
        return openFilePicker(FileSelectionType.FILE, `${homeDir}/Downloads`);
      }
      return null;
    }).then((result) => {
      if (result !== null) {
        settingsManager.updateHost((settings) => { settings.wolSettings.customWolExecPath = result.realpath; });
      }
    }).catch((error) => logger.error(error));
  };

  return (
    <>
      <ToggleField
        label="Use custom WOL executable"
        description={
          <>
            <div>Use provided executable to send Wake On Lan (WOL) to the host.</div>
            <div>The executable will be receive the following arguments: HOSTNAME, IP_ADDRESS, PORT, MAC</div>
          </>
        }
        bottomSeparator="none"
        value={hostSettings.wolSettings.useCustomWolExec}
        setValue={(value) => settingsManager.updateHost((settings) => { settings.wolSettings.useCustomWolExec = value; })}
      />
      <Field
        childrenContainerWidth="max"
        childrenLayout="below"
      >
        <Focusable style={{ display: "grid", gap: "10px", gridTemplateColumns: "1fr auto" }}>
          <AnyTextInput
            disabled={!hostSettings.wolSettings.useCustomWolExec}
            value={hostSettings.wolSettings.customWolExecPath}
            setValue={(value) => settingsManager.updateHost((settings) => { settings.wolSettings.customWolExecPath = value; })}
          />
          <DialogButton
            style={{ minWidth: "initial", width: "initial" }}
            disabled={!hostSettings.wolSettings.useCustomWolExec}
            focusable={hostSettings.wolSettings.useCustomWolExec}
            onClick={() => browseForExec()}
          >
            Browse
          </DialogButton>
        </Focusable>
      </Field>
    </>
  );
};
