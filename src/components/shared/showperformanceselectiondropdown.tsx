import { FC } from "react";
import { ListDropdown } from "./listdropdown";
import { showPerformanceOptions } from "../../lib";

const NoopText = "Don't override";
const ShowPerformanceDropdownValues = [...showPerformanceOptions, NoopText] as const;
const DefaultText = "Select show performance option";

function convertToNoopValue(value: boolean | null): typeof ShowPerformanceDropdownValues[number] {
  if (value == null) return ShowPerformanceDropdownValues[2];

  if (value == true)
    return ShowPerformanceDropdownValues[0]
  else
    return ShowPerformanceDropdownValues[1];
}

function convertFromNoopValue(value: typeof ShowPerformanceDropdownValues[number]): boolean | null {
  if (value === NoopText) return null;

  if (value === showPerformanceOptions[0])
    return true;
  else
    return false;
}

interface Props {
  value: boolean | null;
  setValue: (value: boolean | null) => void;
}

export const ShowPerformanceSelectionDropdown: FC<Props> = ({ value, setValue }) => {
  return (
    <ListDropdown
      optionList={ShowPerformanceDropdownValues}
      label={DefaultText}
      value={convertToNoopValue(value)}
      setValue={(value) => setValue(convertFromNoopValue(value))}
    />
  );
};
