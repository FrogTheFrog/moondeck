import { FC } from "react";
import { ListDropdown } from "../../shared";

const NoopText = "noop" as const;
const ListOptions = [
  { id: true, label: "Enable HDR" },
  { id: false, label: "Disable HDR" },
  { id: NoopText, label: "Don't override" }
] as const;

function convertToNoopValue(value: boolean | null): boolean | typeof NoopText {
  return value ?? NoopText;
}

function convertFromNoopValue(value: boolean | typeof NoopText): boolean | null {
  return value !== NoopText ? value : null;
}

interface Props {
  value: boolean | null;
  setValue: (value: boolean | null) => void;
}

export const HdrSelectionDropdown: FC<Props> = ({ value, setValue }) => {
  return (
    <ListDropdown<boolean | typeof NoopText>
      optionList={ListOptions}
      label="Loading..."
      value={convertToNoopValue(value)}
      setValue={(value) => setValue(convertFromNoopValue(value))}
    />
  );
};
