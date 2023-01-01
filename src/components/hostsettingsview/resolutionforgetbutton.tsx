import { DialogButton } from "decky-frontend-lib";
import { HostResolution } from "../../lib";
import { VFC } from "react";

interface Props {
  currentList: HostResolution["dimensions"];
  currentIndex: HostResolution["selectedDimensionIndex"];
  updateResolution: (list: HostResolution["dimensions"], index: HostResolution["selectedDimensionIndex"]) => void;
}

function isValidIndex(index: number, listSize: number): boolean {
  return index >= 0 && index < listSize;
}

export const ResolutionForgetButton: VFC<Props> = ({ currentList, currentIndex, updateResolution }) => {
  const handleClick = (): void => {
    if (!isValidIndex(currentIndex, currentList.length)) {
      return;
    }

    const listCopy = [...currentList];
    listCopy.splice(currentIndex, 1);
    // Note: -1 is a legit value here
    updateResolution(listCopy, currentIndex < listCopy.length ? currentIndex : listCopy.length - 1);
  };

  return (
    <DialogButton disabled={!isValidIndex(currentIndex, currentList.length)} onClick={() => handleClick()}>
      Forget
    </DialogButton>
  );
};
