import { ConnectivityManager, logger } from "../../lib";
import { FC, useEffect } from "react";
import { ModalRoot } from "@decky/ui";
import { useBuddyStatus } from "../../hooks";

interface Props {
  closeModal: () => void;
  connectivityManager: ConnectivityManager;
  pin: number;
}

export const PairingModal: FC<Props> = ({ closeModal, connectivityManager, pin }) => {
  const [buddyStatus] = useBuddyStatus(connectivityManager);

  const handleDismiss = (): void => {
    connectivityManager.serverProxy.abortPairing().catch((e) => logger.critical(e));
    closeModal();
  };

  useEffect(() => {
    if (buddyStatus !== "Pairing") {
      closeModal();
    }
  }, [buddyStatus]);

  return (
    <ModalRoot closeModal={() => handleDismiss()}>
      <div style={{ fontWeight: "bolder", fontSize: "1.2em", textAlign: "center" }}>
        Enter the following PIN on the host PC
      </div>
      <div style={{ fontWeight: "lighter", fontSize: "10em", textAlign: "center" }}>
        {pin}
      </div>
    </ModalRoot>
  );
};
