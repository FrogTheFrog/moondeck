import { Dropdown, DropdownOption } from "@decky/ui";
import { ReactElement, useEffect, useState } from "react";

interface OptionWithLabel<T> { id: T; label: string }
type OptionList = Readonly<Array<string>> | Readonly<Array<OptionWithLabel<unknown>>>;
type OptionId<T> = T extends OptionWithLabel<infer I> ? I : T;

interface BaseProps {
  disabled?: boolean;
  focusable?: boolean;
  singleItemSelection?: boolean;
  stringifySimpleLabels?: boolean;
  label: string;
}

interface PropsWithoutOptionalValue<T extends OptionList> {
  withOptionalValue?: false;
  optionList: T;
  value: OptionId<T[number]> | null; // null in this case is needed when we don't have a selection yet
  setValue: (value: OptionId<T[number]>) => void;
}

interface PropsWithOptionalValue<T extends OptionList> {
  withOptionalValue: true | string;
  optionList: T;
  value: OptionId<T[number]> | null;
  setValue: (value: OptionId<T[number]> | null) => void;
}

type Props<T extends OptionList> = BaseProps & (PropsWithoutOptionalValue<T> | PropsWithOptionalValue<T>);

function stringifyLabel(value: string): string {
  // Separates camel/snake case into separate words while preserving acronyms.
  const separatedValue = value.replace(/(?<!^|\s)([A-Z])(?![A-Z0-9]|\s|$)/g, " $1");
  return (separatedValue.charAt(0).toUpperCase() + separatedValue.slice(1)).trim();
}

export const ListDropdown: <T extends OptionList>(props: Props<T>) => ReactElement<Props<T>> = ({ disabled, focusable, singleItemSelection, stringifySimpleLabels, label, withOptionalValue, optionList, value, setValue }) => {
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

      if (typeof withOptionalValue === "string" || withOptionalValue === true) {
        dropdownOptions.unshift({ data: null, label: typeof withOptionalValue === "string" ? withOptionalValue : label });
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
