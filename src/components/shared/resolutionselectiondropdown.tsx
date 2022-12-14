import { VFC, useEffect, useState } from "react";
import { HostResolution } from "../../lib";
import { ListDropdown } from "./listdropdown";

interface Props {
  currentIndex: HostResolution["selectedDimensionIndex"];
  currentList: HostResolution["dimensions"];
  setIndex: (value: HostResolution["selectedDimensionIndex"]) => void;
}

function isValidIndex(index: number, listSize: number): boolean {
  return index >= 0 && index < listSize;
}

export const ResolutionSelectionDropdown: VFC<Props> = ({ currentIndex, currentList, setIndex }) => {
  const [currentEntry, setCurrentEntry] = useState<typeof currentIndex | null>(null);
  const [entries, setEntries] = useState<Array<{ id: number | null; label: string }>>([]);

  useEffect(() => {
    const items: typeof entries = currentList.map(({ width, height }, index) => { return { id: index, label: `${width}x${height}` }; });
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
      label="Resolution"
      value={currentEntry}
      setValue={(value) => setIndex(value === null || !isValidIndex(value, currentList.length) ? -1 : value)}
    />
  );
};
