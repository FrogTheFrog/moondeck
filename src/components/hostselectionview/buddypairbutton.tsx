import { ConnectivityManager, logger } from "../../lib";
import { DialogButton, showModal } from "@decky/ui";
import { FC, useState } from "react";
import { PairingModal } from "./pairingmodal";
import { random } from "lodash";

interface Props {
  connectivityManager: ConnectivityManager;
  disabled: boolean;
}

export const BuddyPairButton: FC<Props> = ({ connectivityManager, disabled }) => {
  const [modalIsOpen, setModalIsOpen] = useState(false);

  const handleClick = async (): Promise<void> => {
    const pin = random(1000, 9999);
    setModalIsOpen(true);

    const result = await connectivityManager.serverProxy.startPairing(pin);
    if (result !== "PairingStarted") {
      logger.toast(`Pairing refused due to error: ${result}.`, { output: "error" });
      setModalIsOpen(false);
      return;
    }
    showModal(<PairingModal closeModal={() => setModalIsOpen(false)} connectivityManager={connectivityManager} pin={pin} />);
  };

  return (
    <DialogButton disabled={disabled || modalIsOpen} onClick={() => { handleClick().catch((e) => logger.critical(e)); }}>
      Pair
    </DialogButton>
  );
};
