import { StatusField, StatusFieldProps } from "./statusfield";
import { BuddyStatus } from "../../lib";
import { MoonDeckMain } from "../icons/moondeck";
import { VFC } from "react";

export const BuddyStatusField: VFC<StatusFieldProps<BuddyStatus>> = (props) => {
  const extendedProps = { ...props, ...{ icon: MoonDeckMain } };
  return (
    <StatusField {...extendedProps} />
  );
};
