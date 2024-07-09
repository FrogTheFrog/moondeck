import { ReactNode, VFC } from "react";
import { ToggleField as ToggleFieldDfl } from "@decky/ui";

interface Props {
  label?: ReactNode;
  description?: ReactNode;
  layout?: "below" | "inline";
  bottomSeparator?: "standard" | "thick" | "none";
  disabled?: boolean;
  value: boolean;
  setValue: (value: boolean) => void;
}

export const ToggleField: VFC<Props> = ({ label, description, layout, disabled, bottomSeparator, value, setValue }) => {
  return (
    <ToggleFieldDfl
      label={label}
      description={description}
      layout={layout}
      disabled={disabled}
      bottomSeparator={bottomSeparator}
      checked={value}
      onChange={setValue}
    />
  );
};
