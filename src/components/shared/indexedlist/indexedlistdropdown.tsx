import { ReactElement, useEffect, useState } from "react";
import { ListDropdown } from "../listdropdown";

interface Props<ListElement> {
  label: string;
  currentIndex: number;
  currentList: ListElement[];
  setIndex: (value: number) => void;
  stringifier: (value: ListElement) => string;
}

function isValidIndex(index: number, listSize: number): boolean {
  return index >= 0 && index < listSize;
}

export const IndexedListDropdown: <ListElement>(props: Props<ListElement>) => ReactElement<Props<ListElement>> = ({ label, currentIndex, currentList, setIndex, stringifier }) => {
  const [currentEntry, setCurrentEntry] = useState<number | null>(null);
  const [entries, setEntries] = useState<Array<{ id: number | null; label: string }>>([]);

  useEffect(() => {
    const items: typeof entries = currentList.map((value, index) => { return { id: index, label: stringifier(value) }; });
    if (currentList.length > 0) {
      setEntries(items);
      setCurrentEntry(isValidIndex(currentIndex, currentList.length) ? currentIndex : null);
    } else {
      setEntries([]);
      setCurrentEntry(null);
    }
  }, [currentList, currentIndex]);

  return (
    <ListDropdown<typeof currentEntry>
      disabled={currentList.length === 0}
      optionList={entries}
      label={label}
      value={currentEntry}
      setValue={(value) => setIndex(value === null || !isValidIndex(value, currentList.length) ? -1 : value)}
    />
  );
};
