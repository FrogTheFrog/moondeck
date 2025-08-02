import { FC } from "react";
import { ListDropdown } from "../shared";
import { closeSteamOption } from "../../lib";

const NoopText = "Do Nothing";
const DropdownValues = [...closeSteamOption, NoopText] as const;
const DropdownValuesEx = (() => {
  const extendedValues: Array<{ id: typeof DropdownValues[number]; label: string }> = [];
  for (const value of DropdownValues) {
    switch (value) {
      case NoopText:
        extendedValues.push({ id: value, label: value });
        break;
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

function convertToNoopValue(value: typeof closeSteamOption[number] | null): typeof DropdownValues[number] {
  return value ?? NoopText;
}

function convertFromNoopValue(value: typeof DropdownValues[number]): typeof closeSteamOption[number] | null {
  return value !== NoopText ? value : null;
}

interface Prop {
  value: typeof closeSteamOption[number] | null;
  setValue: (value: typeof closeSteamOption[number] | null) => void;
}

export const CloseSteamDropdown: FC<Prop> = ({ value, setValue }) => {
  return (
    <ListDropdown<unknown>
      optionList={DropdownValuesEx}
      label={NoopText}
      value={convertToNoopValue(value)}
      setValue={(value) => setValue(convertFromNoopValue(value as typeof DropdownValues[number]))}
    />
  );
};
