import { VFC, useEffect, useState } from "react";
import { ListDropdown } from "../shared";
import { UserSettings } from "../../lib";

interface Props {
  disableNoneOption?: boolean;
  singleItemSelection?: boolean;
  disabled: boolean;
  currentSettings: UserSettings;
  setHost: (value: UserSettings["currentHostId"]) => void;
}

export const HostSelectionDropdown: VFC<Props> = ({ disableNoneOption, singleItemSelection, disabled, currentSettings, setHost }) => {
  const [currentHost, setCurrentHost] = useState<UserSettings["currentHostId"]>(null);
  const [entries, setEntries] = useState<Array<{ id: typeof currentHost; label: string }>>([]);

  useEffect(() => {
    const hosts: typeof entries = Object.entries(currentSettings.hostSettings).map(([id, hostSettings]) => { return { id, label: hostSettings.hostName }; });
    if (hosts.length > 0) {
      if (!disableNoneOption) {
        hosts.push({ id: null, label: "None" });
      }

      setEntries(hosts);
      setCurrentHost(currentSettings.currentHostId);
    } else {
      setEntries([]);
      setCurrentHost(null);
    }
  }, [currentSettings]);

  return (
    <ListDropdown<typeof currentHost>
      disabled={disabled}
      singleItemSelection={singleItemSelection}
      optionList={entries}
      label="Select host"
      value={currentHost}
      setValue={setHost}
    />
  );
};
