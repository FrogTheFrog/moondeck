import { DialogButton, showModal } from "@decky/ui";
import { FC } from "react";
import { ManualHostModal } from "./manualhostmodal";

interface Props {
  disabled: boolean;
}

export const AddHostButton: FC<Props> = ({ disabled }) => {
  const handleClick = (): void => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    showModal(<ManualHostModal closeModal={() => {}} />);
  };

  return (
    <DialogButton disabled={disabled} onClick={() => handleClick()}>
      Add host
    </DialogButton>
  );
};
