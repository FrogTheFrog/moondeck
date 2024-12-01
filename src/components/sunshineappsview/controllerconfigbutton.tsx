import { HostSettings, SettingsManager, UserSettings, getControllerConfigDropdownValues, logger, updateControllerConfig } from "../../lib";
import { VFC, useState } from "react";
import { AppDetails } from "@decky/ui";
import { ListDropdown } from "../shared";

interface Props {
  hostSettings: HostSettings;
  shortcuts: AppDetails[];
  settingsManager: SettingsManager;
}

function applyConfig(shortcuts: AppDetails[], value: UserSettings["gameSession"]["controllerConfig"]): void {
  if (value !== "Noop") {
    let counter = 0;
    for (const shortcut of shortcuts) {
      updateControllerConfig(shortcut.unAppID, value);
      counter++;
    }

    logger.toast(`Applied Steam Input setting to ${counter}/${shortcuts.length} app(s).`, { output: "log" });
  }
}

export const ControllerConfigButton: VFC<Props> = ({ hostSettings, shortcuts, settingsManager }) => {
  const [busy, setBusy] = useState<boolean>(false);
  const doApply = (value: UserSettings["gameSession"]["controllerConfig"]): void => {
    if (busy) {
      return;
    }
    setBusy(true);

    settingsManager.updateHost((settings) => {
      settings.sunshineApps.lastSelectedControllerConfig = value;
    });

    applyConfig(shortcuts, value);
    setBusy(false);
  };

  return (
    <ListDropdown<UserSettings["gameSession"]["controllerConfig"]>
      disabled={busy}
      optionList={getControllerConfigDropdownValues()}
      label={"Loading..."}
      value={hostSettings.sunshineApps.lastSelectedControllerConfig}
      setValue={doApply}
    />
  );
};
