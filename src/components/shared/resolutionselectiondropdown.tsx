import { HostResolution, stringifyDimension } from "../../lib";
import { FC } from "react";
import { IndexedListDropdown } from "./indexedlist";

interface Props {
  singleItemSelection?: boolean;
  focusable?: boolean;
  currentIndex: number;
  currentList: HostResolution["dimensions"];
  setIndex: (value: number) => void;
}

export const ResolutionSelectionDropdown: FC<Props> = ({ singleItemSelection, focusable, currentIndex, currentList, setIndex }) => {
  return (
    <IndexedListDropdown<HostResolution["dimensions"][number]>
      label="Select resolution"
      singleItemSelection={singleItemSelection}
      focusable={focusable}
      currentIndex={currentIndex}
      currentList={currentList}
      setIndex={setIndex}
      stringifier={stringifyDimension}
    />
  );
};
