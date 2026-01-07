import { HostResolution, appResolutionOverrideValues } from "../../../lib";
import { FC } from "react";
import { ListDropdown } from "../../shared";

interface Props {
  currentOverride: HostResolution["appResolutionOverride"];
  setOverride: (value: HostResolution["appResolutionOverride"]) => void;
}

export const AppResolutionOverrideDropdown: FC<Props> = ({ currentOverride, setOverride }) => {
  return (
    <ListDropdown
      optionList={appResolutionOverrideValues}
      label="Select override type"
      value={currentOverride}
      setValue={setOverride}
    />
  );
};
