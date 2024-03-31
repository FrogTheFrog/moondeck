import { xOffsetName, yOffsetName, ySpecialOffsetName } from "./offsetstyle";
import { UserSettings } from "../../lib";
import { VFC } from "react";

interface Props {
  buttonPosition?: UserSettings["buttonPosition"];
}

export const ContainerStyle: VFC<Props> = ({ buttonPosition }) => {
  if (!buttonPosition) {
    return null;
  }

  const defaultVerticalOffset = "2.8vw";
  const defaultHorizontalOffset = buttonPosition.horizontalAlignment === "top" ? "56px" : `16px + var(${ySpecialOffsetName})`;

  return (
    <style>
      {
        `
          .moondeck-container {
            position: absolute;
            z-index: ${buttonPosition.zIndex || "auto"};
            ${buttonPosition.verticalAlignment}: calc(${defaultVerticalOffset} + var(${xOffsetName}));
            ${buttonPosition.horizontalAlignment}: calc(${defaultHorizontalOffset} + var(${yOffsetName}));
          }
        `
      }
    </style>
  );
};
