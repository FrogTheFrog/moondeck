import { IconType } from "react-icons";
import { VFC } from "react";

interface Props {
  icon: IconType;
  label: string;
}

export const LabelWithIcon: VFC<Props> = ({ icon: Icon, label }) => {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <Icon style={{ paddingRight: "0.5em", height: "1.25em", width: "auto" }} />
      <span>{label}</span>
    </div>
  );
};
