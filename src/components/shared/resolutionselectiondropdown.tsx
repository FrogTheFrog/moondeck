import { HostResolution, stringifyDimension } from "../../lib";
import { IndexedListDropdown } from "./indexedlist";
import { VFC } from "react";

interface Props {
  singleItemSelection?: boolean;
  focusable?: boolean;
  currentIndex: number;
  currentList: HostResolution["dimensions"];
  setIndex: (value: number) => void;
}

export const ResolutionSelectionDropdown: VFC<Props> = ({ singleItemSelection, focusable, currentIndex, currentList, setIndex }) => {
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
