import { FC } from "react";
import { ListDropdown } from "./listdropdown";

const NoopText = "Don't override";
const BooleanOptions = ["Enabled", "Disabled"] as const;
const BooleanDropdownValuesWithNoop = [...BooleanOptions, NoopText] as const;

function convertToNoopValue(value: boolean | null): typeof BooleanDropdownValuesWithNoop[number] {
  if (value == null) return BooleanDropdownValuesWithNoop[2];

  if (value == true)
    return BooleanDropdownValuesWithNoop[0]
  else
    return BooleanDropdownValuesWithNoop[1];
}

function convertToValue(value: boolean): typeof BooleanOptions[number] {
  if (value == true)
    return BooleanOptions[0];
  else
    return BooleanOptions[1];
}

function convertFromNoopValue(value: typeof BooleanDropdownValuesWithNoop[number]): boolean | null {
  if (value === NoopText) return null;

  if (value === BooleanOptions[0])
    return true;
  else
    return false;
}

interface PropsWithNoop {
  includeNoopOption: true;
  value: boolean | null;
  defaultText: string;
  setValue: (value: boolean | null) => void;
}

interface PropsWithoutNoop {
  includeNoopOption: false;
  value: boolean;
  defaultText: string;
  setValue: (value: typeof BooleanOptions[number]) => void;
}

export const BooleanSelectionDropdown: FC<PropsWithNoop | PropsWithoutNoop> = ({ includeNoopOption, defaultText, value, setValue }) => {
  if (includeNoopOption) {
    return (
      <ListDropdown
        optionList={BooleanDropdownValuesWithNoop}
        label={defaultText}
        value={convertToNoopValue(value)}
        setValue={(value) => setValue(convertFromNoopValue(value))}
      />
    );
  }
  
  return (
    <ListDropdown
      optionList={BooleanOptions}
      label={defaultText}
      value={convertToValue(value)}
      setValue={setValue}
    />
  );
};
