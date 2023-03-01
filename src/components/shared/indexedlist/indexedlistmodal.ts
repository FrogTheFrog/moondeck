import { VFC } from "react";

export interface IndexedListModalProps<ListElement> {
  currentList: ListElement[];
  currentIndex: number | null;
  updateList: (list: ListElement[], index: number) => void;
}

export interface IndexedListModalPropsWithClose<ListElement> extends IndexedListModalProps<ListElement> {
  closeModal: () => void;
}

export type IndexedListModal<ListElement> = VFC<IndexedListModalPropsWithClose<ListElement>>;
