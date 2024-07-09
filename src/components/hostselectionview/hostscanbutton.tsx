import { ConnectivityManager, GameStreamHost, logger } from "../../lib";
import { DialogButton, Menu, MenuItem, showContextMenu } from "@decky/ui";
import { Dispatch, VFC } from "react";

interface Props {
  connectivityManager: ConnectivityManager;
  disabled: boolean;
  isScanning: boolean;
  setIsScanning: Dispatch<boolean>;
}

export const HostScanButton: VFC<Props> = ({ connectivityManager, disabled, isScanning, setIsScanning }) => {
  const addOrUpdateHost = (host: GameStreamHost): void => {
    connectivityManager.serverProxy.updateHostSettings(host, true, false).catch((e) => logger.critical(e));
  };

  const handleClick = async (): Promise<void> => {
    setIsScanning(true);
    const hosts = await connectivityManager.serverProxy.scanForHosts();
    setIsScanning(false);

    if (hosts.length > 0) {
      showContextMenu(
        <Menu label="Select host to add" cancelText="Cancel">
          {hosts.map((host) => <MenuItem onSelected={() => addOrUpdateHost(host)}>{host.hostName}</MenuItem>)}
        </Menu>
      );
    } else {
      logger.toast("No hosts were found!");
    }
  };

  return (
    <DialogButton disabled={disabled} onClick={() => { handleClick().catch((e) => logger.critical(e)); }}>
      {isScanning ? "Scanning..." : "Scan"}
    </DialogButton>
  );
};
