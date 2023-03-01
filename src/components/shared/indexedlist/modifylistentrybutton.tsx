import { DialogButton, showModal } from "decky-frontend-lib";
import { IndexedListModal, IndexedListModalProps, IndexedListModalPropsWithClose } from "./indexedlistmodal";
import { ReactElement, VFC } from "react";

interface Props<ListElement, Modal extends IndexedListModal<ListElement>> extends IndexedListModalProps<ListElement> {
  modal: Modal;
}

export const ModifyListButton: <ListElement, Modal extends IndexedListModal<ListElement>>(props: Props<ListElement, Modal>) => ReactElement<Props<ListElement, Modal>> = ({ modal, currentIndex, currentList, updateList }) => {
  const isEnabled = currentIndex === null || (currentIndex >= 0 && currentIndex < currentList.length);
  const handleClick = (): void => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Modal = modal as VFC<IndexedListModalPropsWithClose<any>>;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    showModal(<Modal closeModal={() => {}} currentIndex={currentIndex} currentList={currentList} updateList={updateList} />);
  };

  return (
    <DialogButton disabled={!isEnabled} focusable={isEnabled} onClick={() => handleClick()}>
      {currentIndex === null ? "Add" : "Edit"}
    </DialogButton>
  );
};
