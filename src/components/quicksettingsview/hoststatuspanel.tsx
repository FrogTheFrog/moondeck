import { BuddyStatus, ServerStatus, SettingsManager, UserSettings } from "../../lib";
import { BuddyStatusField, LabelWithIcon, ServerStatusField } from "../shared";
import { Field, PanelSection, PanelSectionRow } from "decky-frontend-lib";
import { CurrentHostSettings } from "../../hooks";
import { HostOff } from "../icons";
import { HostSelectionDropdown } from "../hostselectionview/hostselectiondropdown";
import { VFC } from "react";

interface Props {
  currentHostSettings: CurrentHostSettings | null;
  currentSettings: UserSettings | null;
  settingsManager: SettingsManager;
  serverStatus: ServerStatus;
  serverRefreshStatus: boolean;
  buddyStatus: BuddyStatus;
  buddyRefreshStatus: boolean;
}

export const HostStatusPanel: VFC<Props> = ({ currentHostSettings, currentSettings, settingsManager, serverStatus, serverRefreshStatus, buddyStatus, buddyRefreshStatus }) => {
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

  const disabledDropdown = Object.keys(currentSettings.hostSettings).length < 2;
  return (
    <PanelSection title="STATUS">
      <PanelSectionRow>
        <HostSelectionDropdown
          disableNoneOption={true}
          disabled={disabledDropdown}
          focusable={!disabledDropdown}
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
