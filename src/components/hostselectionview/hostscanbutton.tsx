import { DialogButton, Menu, MenuItem, showContextMenu } from "@decky/ui";
import { Dispatch, FC, useContext } from "react";
import { GameStreamHost, logger } from "../../lib";
import { MoonDeckContext } from "../../contexts";

interface Props {
  disabled: boolean;
  isScanning: boolean;
  setIsScanning: Dispatch<boolean>;
}

export const HostScanButton: FC<Props> = ({ disabled, isScanning, setIsScanning }) => {
  const { connectivityManager } = useContext(MoonDeckContext);
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
