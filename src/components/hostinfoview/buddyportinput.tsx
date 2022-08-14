import { ChangeEvent, VFC, useEffect, useState } from "react";
import { SettingsManager, logger } from "../../lib";
import { CurrentHostSettings } from "../../hooks";
import { TextField } from "decky-frontend-lib";
import { debounce } from "lodash";

interface Props {
  currentHostSettings: CurrentHostSettings;
  settingsManager: SettingsManager;
}

const updatePortWithDebounce = debounce((value: number, settingsManager: SettingsManager, currentHostSettings: CurrentHostSettings) => {
  if (value !== currentHostSettings.buddyPort) {
    const settings = settingsManager.cloneSettings();
    if (settings === null) {
      return;
    }

    const hostSettings = settings.hostSettings[currentHostSettings.currentHostId];
    if (hostSettings === undefined) {
      return;
    }

    hostSettings.buddyPort = value;
    settingsManager.set(settings).catch((e) => logger.critical(e));
  }
}, 1000);

export const BuddyPortInput: VFC<Props> = ({ currentHostSettings, settingsManager }) => {
  const [portValue, setPortValue] = useState<string | null>(null);

  useEffect(() => {
    if (portValue === null && currentHostSettings !== null) {
      setPortValue(`${currentHostSettings.buddyPort}`);
    }
  }, [currentHostSettings]);

  const handlePortChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const value = Number(event.target.value);
    const validValue = value > 0 && value <= 65535;
    if (!validValue) {
      if (event.target.value.length === 0) {
        setPortValue(event.target.value);
      }
      event.preventDefault();
      return;
    }

    setPortValue(event.target.value);
    updatePortWithDebounce(value, settingsManager, currentHostSettings);
  };

  return (
    <TextField
      style={{ width: "5em", textAlign: "right" }}
      value={portValue ?? ""}
      onChange={(event) => handlePortChange(event)} />
  );
};
