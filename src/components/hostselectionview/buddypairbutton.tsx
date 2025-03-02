import { DialogButton, showModal } from "@decky/ui";
import { FC, useContext, useState } from "react";
import { MoonDeckContext } from "../../contexts";
import { PairingModal } from "./pairingmodal";
import { logger } from "../../lib";
import { random } from "lodash";

interface Props {
  disabled: boolean;
}

export const BuddyPairButton: FC<Props> = ({ disabled }) => {
  const { connectivityManager } = useContext(MoonDeckContext);
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
    showModal(<PairingModal closeModal={() => setModalIsOpen(false)} pin={pin} />);
  };

  return (
    <DialogButton disabled={disabled || modalIsOpen} onClick={() => { handleClick().catch((e) => logger.critical(e)); }}>
      Pair
    </DialogButton>
  );
};
