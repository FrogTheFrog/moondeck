import { DialogButton, showModal } from "@decky/ui";
import { ConnectivityManager } from "../../lib";
import { ManualHostModal } from "./manualhostmodal";
import { VFC } from "react";

interface Props {
  connectivityManager: ConnectivityManager;
  disabled: boolean;
}

export const AddHostButton: VFC<Props> = ({ connectivityManager, disabled }) => {
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
