import { FC } from "react";
import { HostApp } from "../../lib";
import { IndexedListDropdown } from "./indexedlist";

interface Props {
  currentIndex: number;
  currentList: HostApp["apps"];
  setIndex: (value: number) => void;
}

export const HostAppSelectionDropdown: FC<Props> = ({ currentIndex, currentList, setIndex }) => {
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
