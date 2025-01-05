import { BuddyStatus, ServerStatus } from "../../lib";
import { Field, Spinner } from "@decky/ui";
import { FC } from "react";
import { IconType } from "react-icons";
import { LabelWithIcon } from "./labelwithicon";

export function stringifyStatus<T extends BuddyStatus | ServerStatus>(value: T): string {
  return value.replace(/([A-Z])/g, " $1");
}

export interface StatusFieldProps<T> {
  status: T;
  isRefreshing: boolean;
  label: string;
  noSeparator?: boolean;
}

interface ExtendedProps<T> extends StatusFieldProps<T> {
  icon: IconType;
}

export const StatusField: FC<ExtendedProps<BuddyStatus | ServerStatus>> = ({ status, isRefreshing, label, noSeparator, icon }) => {
  return (
    <Field
      label={<LabelWithIcon icon={icon} label={label} />}
      childrenContainerWidth={"min"}
      verticalAlignment="center"
      bottomSeparator={noSeparator === true ? "none" : "standard"}
    >
      <div style={{ display: "grid", alignItems: "center", justifyContent: "end", gridTemplateColumns: "auto auto", width: "100%" }}>
        {isRefreshing && <Spinner style={{ height: "1.25em", paddingRight: "0.5em", width: "auto" }} />}
        <span>{stringifyStatus(status)}</span>
      </div>
    </Field>
  );
};
