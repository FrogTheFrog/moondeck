import { ConnectivityManager, logger } from "../../lib";
import { DialogButton, showModal } from "decky-frontend-lib";
import { VFC, useState } from "react";
import { PairingModal } from "./pairingmodal";
import { random } from "lodash";

interface Props {
  connectivityManager: ConnectivityManager;
  disabled: boolean;
}

export const BuddyPairButton: VFC<Props> = ({ connectivityManager, disabled }) => {
  const [modalIsOpen, setModalIsOpen] = useState(false);

  const handleClick = async (): Promise<void> => {
    const pin = random(1000, 9999);
    setModalIsOpen(true);

    const result = await connectivityManager.serverProxy.startPairing(pin);
    if (result !== "PairingStarted") {
      logger.toast(result, { output: "error" });
      setModalIsOpen(false);
      return;
    }
    await showModal(<PairingModal closeModal={() => setModalIsOpen(false)} connectivityManager={connectivityManager} pin={pin} />);
  };

  return (
    <DialogButton disabled={disabled || modalIsOpen} onClick={() => { handleClick().catch((e) => logger.critical(e)); }}>
      Pair
    </DialogButton>
  );
};
