import { BuddyStatus, ServerStatus, UserSettings } from "../../lib";
import { BuddyStatusField, LabelWithIcon, ServerStatusField } from "../shared";
import { FC, useContext } from "react";
import { Field, PanelSection, PanelSectionRow } from "@decky/ui";
import { CurrentHostSettings } from "../../hooks";
import { HostOff } from "../icons";
import { HostSelectionDropdown } from "../hostselectionview/hostselectiondropdown";
import { MoonDeckContext } from "../../contexts";

interface Props {
  currentHostSettings: CurrentHostSettings | null;
  currentSettings: UserSettings | null;
  serverStatus: ServerStatus;
  serverRefreshStatus: boolean;
  buddyStatus: BuddyStatus;
  buddyRefreshStatus: boolean;
}

export const HostStatusPanel: FC<Props> = ({ currentHostSettings, currentSettings, serverStatus, serverRefreshStatus, buddyStatus, buddyRefreshStatus }) => {
  const { settingsManager } = useContext(MoonDeckContext);

  if (currentHostSettings === null || currentSettings === null) {
    return (
      <PanelSection title="STATUS">
        <PanelSectionRow>
          <Field
            label={<LabelWithIcon icon={HostOff} label="HOST IS NOT SELECTED" />}
            description="Go to settings to select host" />
        </PanelSectionRow>
      </PanelSection>
    );
  }

  return (
    <PanelSection title="STATUS">
      <PanelSectionRow>
        <HostSelectionDropdown
          disableNoneOption={true}
          disabled={false}
          singleItemSelection={true}
          currentSettings={currentSettings}
          setHost={(value) => { settingsManager.update((settings) => { settings.currentHostId = value; }); }}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <ServerStatusField label="GameStream" status={serverStatus} isRefreshing={serverRefreshStatus} noSeparator={true} />
      </PanelSectionRow>
      <PanelSectionRow>
        <BuddyStatusField label="Buddy" status={buddyStatus} isRefreshing={buddyRefreshStatus} />
      </PanelSectionRow>
    </PanelSection>
  );
};
