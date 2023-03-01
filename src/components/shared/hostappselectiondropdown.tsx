import { HostApp } from "../../lib";
import { IndexedListDropdown } from "./indexedlist";
import { VFC } from "react";

interface Props {
  currentIndex: number;
  currentList: HostApp["apps"];
  setIndex: (value: number) => void;
}

export const HostAppSelectionDropdown: VFC<Props> = ({ currentIndex, currentList, setIndex }) => {
  return (
    <IndexedListDropdown<HostApp["apps"][number]>
      label="MoonDeckStream"
      currentIndex={currentIndex}
      currentList={currentList}
      setIndex={setIndex}
      stringifier={(value) => value}
    />
  );
};
