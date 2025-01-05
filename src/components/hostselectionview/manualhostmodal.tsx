import { ConnectivityManager, GameStreamHost, logger } from "../../lib";
import { DialogButton, Field, ModalRoot, sleep } from "@decky/ui";
import { FC, useState } from "react";
import { NonEmptyTextInput, NumericTextInput } from "../shared";

interface Props {
  closeModal: () => void;
  connectivityManager: ConnectivityManager;
}

export const ManualHostModal: FC<Props> = ({ closeModal, connectivityManager }) => {
  const [address, setAddress] = useState("");
  const [port, setPort] = useState(47989);
  const [verifiedHost, setVerifiedHost] = useState<GameStreamHost | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isValidAddress, setIsValidAddress] = useState(false);
  const [isValidPort, setIsValidPort] = useState(false);

  const handleDismiss = (): void => {
    closeModal();
  };

  const handleClick = (): void => {
    if (verifiedHost === null) {
      setIsVerifying(true);
      connectivityManager.serverProxy.getServerInfo(address, port)
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
      <Field
        label={
          <span style={{ width: "100%", textAlign: "center" }}>
            {`http://${address.length > 0 ? address : "{address}"}:${port}`}
          </span>
        }
        childrenContainerWidth="fixed"
      >
      </Field>
      <Field
        label="Address"
        childrenContainerWidth="fixed"
      >
        <NonEmptyTextInput
          disabled={isVerifying}
          value={address}
          setValue={(value) => { setVerifiedHost(null); setAddress(value); }}
          setIsValid={setIsValidAddress}
        />
      </Field>
      <Field
        label="Port (the lower one)"
        childrenContainerWidth="fixed"
      >
        <NumericTextInput
          min={1}
          max={65535}
          disabled={isVerifying}
          value={port}
          setValue={(value) => { setVerifiedHost(null); setPort(value); }}
          setIsValid={setIsValidPort}
        />
      </Field>
      <Field
        childrenLayout="below"
        childrenContainerWidth="max"
        bottomSeparator="none"
      >
        <DialogButton disabled={isVerifying || !isValidAddress || !isValidPort} onClick={handleClick}>
          {verifiedHost ? "Add host" : "Check connectivity"}
        </DialogButton>
      </Field>
    </ModalRoot>
  );
};
