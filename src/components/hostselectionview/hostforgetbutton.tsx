import { ConfirmModal, DialogButton, showModal } from "decky-frontend-lib";
import { SettingsManager, logger } from "../../lib";
import { HostNames } from "../../hooks";
import { VFC } from "react";

interface Props {
  disabled: boolean;
  hostNames: HostNames;
  settingsManager: SettingsManager;
}

export const HostForgetButton: VFC<Props> = ({ disabled, hostNames, settingsManager }) => {
  const handleClick = (hostId: string | null): void => {
    showModal(
      <ConfirmModal
        strTitle="Are you sure you want to forget?"
        strDescription="This action cannot be undone."
        onOK={() => {
          const settings = settingsManager.cloneSettings();
          if (hostId !== null && settings !== null) {
            settings.currentHostId = null;
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete settings.hostSettings[hostId];
            settingsManager.set(settings).catch((e) => logger.critical(e));
          }
        }}
      />
    ).catch((e) => logger.critical(e));
  };

  return (
    <DialogButton disabled={disabled} onClick={() => handleClick(hostNames?.currentId ?? null)}>
      Forget
    </DialogButton>
  );
};
