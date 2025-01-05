import { DialogButton, showModal } from "@decky/ui";
import { ConnectivityManager } from "../../lib";
import { FC } from "react";
import { ManualHostModal } from "./manualhostmodal";

interface Props {
  connectivityManager: ConnectivityManager;
  disabled: boolean;
}

export const AddHostButton: FC<Props> = ({ connectivityManager, disabled }) => {
  const handleClick = (): void => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    showModal(<ManualHostModal closeModal={() => {}} connectivityManager={connectivityManager} />);
  };

  return (
    <DialogButton disabled={disabled} onClick={() => handleClick()}>
      Add host
    </DialogButton>
  );
};
