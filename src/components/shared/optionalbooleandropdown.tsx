import { FC } from "react";
import { ListDropdown } from "./listdropdown";

const ListOptions = [
  { id: true, label: "Enabled" },
  { id: false, label: "Disabled" }
] as const;

interface Props {
  optValueLabel: string;
  value: boolean | null;
  setValue: (value: boolean | null) => void;
}

export const OptionalBooleanDropdown: FC<Props> = ({ optValueLabel, value, setValue }) => {
  return (
    <ListDropdown
      optionList={ListOptions}
      label={optValueLabel}
      withOptionalValue={true}
      value={value}
      setValue={(value) => setValue(value)}
    />
  );
};
