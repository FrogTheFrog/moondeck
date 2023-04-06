import { HostResolution, stringifyDimension } from "../../lib";
import { IndexedListDropdown } from "./indexedlist";
import { VFC } from "react";

interface Props {
  currentIndex: number;
  currentList: HostResolution["dimensions"];
  setIndex: (value: number) => void;
}

export const ResolutionSelectionDropdown: VFC<Props> = ({ currentIndex, currentList, setIndex }) => {
  return (
    <IndexedListDropdown<HostResolution["dimensions"][number]>
      label="Select resolution"
      currentIndex={currentIndex}
      currentList={currentList}
      setIndex={setIndex}
      stringifier={stringifyDimension}
    />
  );
};
