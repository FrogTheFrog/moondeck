import { HostResolution, appResolutionOverrideValues } from "../../lib";
import { ListDropdown } from "../shared";
import { VFC } from "react";

interface Props {
  currentOverride: HostResolution["appResolutionOverride"];
  setOverride: (value: HostResolution["appResolutionOverride"]) => void;
}

function entryToLabel(value: string): string {
  return value.replace(/([A-Z])/g, " $1");
}

const entries = appResolutionOverrideValues.map((entry) => { return { id: entry, label: entryToLabel(entry) }; });
export const AppResolutionOverrideDropdown: VFC<Props> = ({ currentOverride, setOverride }) => {
  return (
    <ListDropdown<typeof currentOverride>
      optionList={entries}
      label="Select override type"
      value={currentOverride}
      setValue={setOverride}
    />
  );
};
