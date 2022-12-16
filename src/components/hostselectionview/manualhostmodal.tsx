import { ConnectivityManager, GameStreamHost, logger } from "../../lib";
import { DialogButton, ModalRoot, sleep } from "decky-frontend-lib";
import { VFC, useState } from "react";
import { IpAddressTextInput } from "../shared";

interface Props {
  closeModal: () => void;
  connectivityManager: ConnectivityManager;
}

export const ManualHostModal: VFC<Props> = ({ closeModal, connectivityManager }) => {
  const [address, setAddress] = useState("");
  const [verifiedHost, setVerifiedHost] = useState<GameStreamHost | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isValidAddress, setIsValidAddress] = useState(false);

  const handleDismiss = (): void => {
    closeModal();
  };

  const handleClick = (): void => {
    if (verifiedHost === null) {
      setIsVerifying(true);
      connectivityManager.serverProxy.getServerInfo(address)
        .then(async (host): Promise<void> => {
          // For user experience
          await sleep(1000);
          if (host === null) {
            logger.toast("Host is unreachable.");
          }
          setVerifiedHost(host);
        })
        .catch((e) => logger.critical(e))
        .finally(() => setIsVerifying(false));
      return;
    }

    connectivityManager.serverProxy.updateHostSettings(verifiedHost, true, true)
      .catch((e) => logger.critical(e))
      .finally(() => closeModal());
  };

  return (
    <ModalRoot closeModal={handleDismiss}>
      <div style={{ fontWeight: "bolder", marginBottom: "1em" }}>
        Enter IPv4 address
      </div>
      <IpAddressTextInput
        disabled={isVerifying}
        value={address}
        setValue={(value) => { setVerifiedHost(null); setAddress(value); }}
        setIsValid={setIsValidAddress}
      />
      <DialogButton disabled={isVerifying || !isValidAddress} style={{ marginTop: "1em" }} onClick={handleClick}>
        {verifiedHost ? "Add host" : "Check connectivity"}
      </DialogButton>
    </ModalRoot>
  );
};
