import { DialogButton } from "decky-frontend-lib";
import { IndexedListModalProps } from "./indexedlistmodal";
import { ReactElement } from "react";

interface Props<ListElement> extends IndexedListModalProps<ListElement> {
}

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
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    listCopy.splice(currentIndex!, 1);
    // Note: -1 is a legit value here
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    updateList(listCopy, currentIndex! < listCopy.length ? currentIndex! : listCopy.length - 1);
  };

  return (
    <DialogButton disabled={!isEnabled} focusable={isEnabled} onClick={() => handleClick()}>
      Forget
    </DialogButton>
  );
};
