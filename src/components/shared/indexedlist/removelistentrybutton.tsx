import { DialogButton } from "@decky/ui";
import { IndexedListModalProps } from "./indexedlistmodal";
import { ReactElement } from "react";

type Props<ListElement> = IndexedListModalProps<ListElement>;

function isValidIndex(index: number | null, listSize: number): boolean {
  return index !== null && index >= 0 && index < listSize;
}

export const RemoveListEntryButton: <ListElement>(props: Props<ListElement>) => ReactElement<Props<ListElement>> = ({ currentList, currentIndex, updateList }) => {
  const isEnabled = isValidIndex(currentIndex, currentList.length);
  const handleClick = (): void => {
    if (!isValidIndex(currentIndex, currentList.length)) {
      return;
    }

    const listCopy = [...currentList];
    listCopy.splice(currentIndex!, 1);
    // Note: -1 is a legit value here
    updateList(listCopy, currentIndex! < listCopy.length ? currentIndex! : listCopy.length - 1);
  };

  return (
    <DialogButton disabled={!isEnabled} focusable={isEnabled} onClick={() => handleClick()}>
      Forget
    </DialogButton>
  );
};
