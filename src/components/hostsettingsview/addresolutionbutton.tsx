import { DialogButton, showModal } from "decky-frontend-lib";
import { AddResolutionModal } from "./addresolutionmodal";
import { HostResolution } from "../../lib";
import { VFC } from "react";

interface Props {
  currentList: HostResolution["dimensions"];
  updateResolution: (list: HostResolution["dimensions"], index: HostResolution["selectedDimensionIndex"]) => void;
}

export const AddResolutionButton: VFC<Props> = (props) => {
  const handleClick = (): void => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    showModal(<AddResolutionModal closeModal={() => {}} {...props} />);
  };

  return (
    <DialogButton onClick={() => handleClick()}>
      Add
    </DialogButton>
  );
};
