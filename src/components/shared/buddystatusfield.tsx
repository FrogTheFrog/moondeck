import { StatusField, StatusFieldProps } from "./statusfield";
import { BuddyStatus } from "../../lib";
import { FC } from "react";
import { MoonDeckMain } from "../icons/moondeck";

export const BuddyStatusField: FC<StatusFieldProps<BuddyStatus>> = (props) => {
  const extendedProps = { ...props, ...{ icon: MoonDeckMain } };
  return (
    <StatusField {...extendedProps} />
  );
};
