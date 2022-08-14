import { BuddyStatus, ServerStatus } from "../../lib";
import { BuddyStatusField, LabelWithIcon, ServerStatusField } from "../shared";
import { Field, PanelSection, PanelSectionRow } from "decky-frontend-lib";
import { HostOff, HostOn } from "../icons";
import { CurrentHostSettings } from "../../hooks";
import { VFC } from "react";

interface Props {
  currentHostSettings: CurrentHostSettings | null;
  serverStatus: ServerStatus;
  serverRefreshStatus: boolean;
  buddyStatus: BuddyStatus;
  buddyRefreshStatus: boolean;
}

export const HostStatusPanel: VFC<Props> = ({ currentHostSettings, serverStatus, serverRefreshStatus, buddyStatus, buddyRefreshStatus }) => {
  if (currentHostSettings === null) {
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
        <Field label={<LabelWithIcon icon={HostOn} label={currentHostSettings.hostName} />} bottomSeparator={"none"} />
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
