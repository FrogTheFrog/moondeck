import { FC } from "react";
import { ListDropdown } from "../shared";
import { closeSteamOption } from "../../lib";

const DropdownValuesOptions = (() => {
  const extendedValues: Array<{ id: typeof closeSteamOption[number]; label: string }> = [];
  for (const value of closeSteamOption) {
    switch (value) {
      case "Client":
        extendedValues.push({ id: value, label: "Close Steam Client" });
        break;
      case "BigPictureMode":
        extendedValues.push({ id: value, label: "Close Big Picture Mode" });
        break;
    }
  }
  return extendedValues;
})();

interface Prop {
  value: typeof closeSteamOption[number] | null;
  setValue: (value: typeof closeSteamOption[number] | null) => void;
}

export const CloseSteamDropdown: FC<Prop> = ({ value, setValue }) => {
  return (
    <ListDropdown
      optionList={DropdownValuesOptions}
      label="Do Nothing"
      withOptionalValue={true}
      value={value}
      setValue={setValue}
    />
  );
};
