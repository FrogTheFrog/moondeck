import { FC } from "react";
import { ListDropdown } from "./listdropdown";
import { audioOptions } from "../../lib";

const NoopText = "Don't override Moonlight";
const AudioDropdownValuesWithNoop = [...audioOptions, NoopText] as const;
const AudioDropdownValuesWithoutNoop = [...audioOptions] as const;
const DefaultText = "Select audio option";

function convertToNoopValue(value: typeof audioOptions[number] | null): typeof AudioDropdownValuesWithNoop[number] {
  return value ?? NoopText;
}

function convertFromNoopValue(value: typeof AudioDropdownValuesWithNoop[number]): typeof audioOptions[number] | null {
  return value !== NoopText ? value : null;
}

interface PropsWithNoop {
  includeNoopOption: true;
  value: typeof audioOptions[number] | null;
  setValue: (value: typeof audioOptions[number] | null) => void;
}

interface PropsWithoutNoop {
  includeNoopOption: false;
  value: typeof audioOptions[number] | null;
  setValue: (value: typeof audioOptions[number]) => void;
}

export const AudioSelectionDropdown: FC<PropsWithNoop | PropsWithoutNoop> = ({ includeNoopOption, value, setValue }) => {
  if (includeNoopOption) {
    return (
      <ListDropdown
        optionList={AudioDropdownValuesWithNoop}
        label={DefaultText}
        value={convertToNoopValue(value)}
        setValue={(value) => setValue(convertFromNoopValue(value))}
      />
    );
  }

  return (
    <ListDropdown
      optionList={AudioDropdownValuesWithoutNoop}
      label={DefaultText}
      value={value}
      setValue={setValue}
    />
  );
};
