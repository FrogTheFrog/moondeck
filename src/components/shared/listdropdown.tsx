import { Dropdown, DropdownOption } from "@decky/ui";
import { ReactElement, useEffect, useState } from "react";

interface OptionWithLabel<T> { id: T; label: string }
type Option<T> = T extends string ? (T | OptionWithLabel<T>) : OptionWithLabel<T>;

interface Props<T> {
  disabled?: boolean;
  focusable?: boolean;
  singleItemSelection?: boolean;
  stringifySimpleLabels?: boolean;
  optionList: Readonly<Array<Option<T>>>;
  label: string;
  value: T | null;
  setValue: (value: T) => void;
}

function stringifyLabel(value: string): string {
  const separatedValue = value.replace(/([A-Z])/g, " $1");
  return separatedValue.charAt(0).toUpperCase() + separatedValue.slice(1);
}

export const ListDropdown: <T>(props: Props<T>) => ReactElement<Props<T>> = ({ disabled, focusable, singleItemSelection, stringifySimpleLabels, optionList, label, value, setValue }) => {
  const [options, setOptions] = useState<DropdownOption[]>([]);

  useEffect(() => {
    if (optionList.length > 0) {
      const dropdownOptions: DropdownOption[] = [];
      for (const option of optionList) {
        if (typeof option === "string") {
          dropdownOptions.push({ data: option, label: stringifySimpleLabels === false ? option : stringifyLabel(option) });
        } else {
          dropdownOptions.push({ data: option.id, label: option.label });
        }
      }

      setOptions(dropdownOptions);
    } else {
      setOptions([]);
    }
  }, [optionList]);

  return (
    <Dropdown
      disabled={(disabled ?? false) || options.length < ((singleItemSelection ?? false) ? 1 : 2)}
      rgOptions={options}
      strDefaultLabel={label}
      selectedOption={value}
      focusable={focusable}
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      onChange={(option) => setValue(option.data)}
    />
  );
};
