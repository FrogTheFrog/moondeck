import { BuddyStatusField, ServerStatusField, SettingsLoadingField } from "../shared";
import { ConnectivityManager, SettingsManager } from "../../lib";
import { DialogBody, DialogControlsSection, DialogControlsSectionHeader, Field } from "decky-frontend-lib";
import { VFC, useState } from "react";
import { useBuddyStatus, useCurrentSettings, useServerStatus } from "../../hooks";
import { BuddyPairButton } from "./buddypairbutton";
import { HostForgetButton } from "./hostforgetbutton";
import { HostScanButton } from "./hostscanbutton";
import { HostSelectionDropdown } from "./hostselectiondropdown";

interface Props {
  connectivityManager: ConnectivityManager;
  settingsManager: SettingsManager;
}

export const HostSelectionView: VFC<Props> = ({ connectivityManager, settingsManager }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [serverStatus, serverRefreshStatus] = useServerStatus(connectivityManager);
  const [buddyStatus, buddyRefreshStatus] = useBuddyStatus(connectivityManager);
  const settings = useCurrentSettings(settingsManager);

  if (settings === null) {
    return <SettingsLoadingField />;
  }

  return (
    <DialogBody>
      <DialogControlsSection>
        <DialogControlsSectionHeader>GameStream Server</DialogControlsSectionHeader>
        <ServerStatusField label="Status" status={serverStatus} isRefreshing={serverRefreshStatus} />
        <Field
          label="Current host"
          childrenContainerWidth="fixed"
          description="Select the GameStream host you would like to connect to."
        >
          <HostSelectionDropdown
            disabled={isScanning}
            currentSettings={settings}
            setHost={(value) => { settingsManager.update((settings) => { settings.currentHostId = value; }); }}
          />
        </Field>
        <Field
          label="Scan local network"
          description="The GameStream service broadcasts itself on the local network for discovery (proxy on the host might prevent that)."
          childrenContainerWidth="fixed"
        >
          <HostScanButton
            disabled={isScanning}
            isScanning={isScanning}
            setIsScanning={setIsScanning}
            connectivityManager={connectivityManager}
          />
        </Field>
        <Field
          label="Forget current host"
          childrenContainerWidth="fixed"
        >
          <HostForgetButton
            disabled={isScanning || settings.currentHostId === null}
            currentHost={settings.currentHostId}
            onForget={(value) => {
              settingsManager.update((settings) => {
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                delete settings.hostSettings[value];
                settings.currentHostId = null;
              });
            }}
          />
        </Field>
      </DialogControlsSection>
      <DialogControlsSection>
        <DialogControlsSectionHeader>MoonDeck Buddy</DialogControlsSectionHeader>
        <BuddyStatusField label="Status" status={buddyStatus} isRefreshing={buddyRefreshStatus} />
        <Field
          label="Pair with Buddy"
          childrenContainerWidth="fixed"
        >
          <BuddyPairButton
            connectivityManager={connectivityManager}
            disabled={isScanning || buddyStatus !== "NotPaired"} />
        </Field>
      </DialogControlsSection>
    </DialogBody>
  );
};
