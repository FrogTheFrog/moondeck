import { FC } from "react";
import { ListDropdown } from "./listdropdown";
import { videoCodecOptions } from "../../lib";

const NoopText = "Don't override";
const VideoCodecDropdownValues = [...videoCodecOptions, NoopText] as const;
const DefaultText = "Select video codec options";

function convertToNoopValue(value: typeof videoCodecOptions[number] | null): typeof VideoCodecDropdownValues[number] {
  return value ?? NoopText;
}

function convertFromNoopValue(value: typeof VideoCodecDropdownValues[number]): typeof videoCodecOptions[number] | null {
  return value === NoopText ? null : value;
}

function getVideoCodecDropdownValues(): Array<{ id: (typeof VideoCodecDropdownValues[number]); label: string }> {
  return VideoCodecDropdownValues.map((value) => ({
    id: value,
    label: value
  }));
}

interface Props {
  value: typeof videoCodecOptions[number] | null;
  setValue: (value: typeof videoCodecOptions[number] | null) => void;
}

export const VideoCodecSelectionDropdown: FC<Props> = ({ value, setValue }) => {
  return (
    <ListDropdown<typeof VideoCodecDropdownValues[number]>
      optionList={getVideoCodecDropdownValues()}
      label={DefaultText}
      value={convertToNoopValue(value)}
      setValue={(value) => setValue(convertFromNoopValue(value))}
    />
  );
};