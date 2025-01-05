import { HostResolution, appResolutionOverrideValues } from "../../lib";
import { FC } from "react";
import { ListDropdown } from "../shared";

interface Props {
  currentOverride: HostResolution["appResolutionOverride"];
  setOverride: (value: HostResolution["appResolutionOverride"]) => void;
}

function entryToLabel(value: string): string {
  return value.replace(/([A-Z])/g, " $1");
}

const entries = appResolutionOverrideValues.map((entry) => { return { id: entry, label: entryToLabel(entry) }; });
export const AppResolutionOverrideDropdown: FC<Props> = ({ currentOverride, setOverride }) => {
  return (
    <ListDropdown<typeof currentOverride>
      optionList={entries}
      label="Select override type"
      value={currentOverride}
      setValue={setOverride}
    />
  );
};
