import { Dropdown, DropdownOption } from "decky-frontend-lib";
import { SettingsManager, logger } from "../../lib";
import { VFC, useEffect, useState } from "react";
import { HostNames } from "../../hooks";

interface Props {
  disabled: boolean;
  hostNames: HostNames;
  settingsManager: SettingsManager;
}

export const HostSelectionDropdown: VFC<Props> = ({ disabled, hostNames, settingsManager }) => {
  const [hostOptions, setHostOptions] = useState<DropdownOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const handleChange = (hostId: string | null): void => {
    const settings = settingsManager.cloneSettings();
    if (settings !== null) {
      settings.currentHostId = hostId;
      settingsManager.set(settings).catch((e) => logger.critical(e));
    }
  };

  useEffect(() => {
    if (hostNames !== null && hostNames.entries.length > 0) {
      const dropdownOptions: DropdownOption[] = [{ data: null, label: "None" }];
      for (const { id, name } of hostNames.entries) {
        dropdownOptions.push({ data: id, label: name });
      }
      setHostOptions(dropdownOptions);
      setSelectedOption(hostNames.currentId);
    } else {
      setHostOptions([]);
      setSelectedOption(null);
    }
  }, [hostNames]);

  return (
    <Dropdown
      disabled={disabled || hostOptions.length === 0}
      rgOptions={hostOptions}
      strDefaultLabel="Select host"
      selectedOption={selectedOption}
      focusable={true}
      onChange={(option) => handleChange((option as { data: string | null }).data)}
    />
  );
};
