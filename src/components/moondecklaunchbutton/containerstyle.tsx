import { xOffsetName, yOffsetName, ySpecialOffsetName } from "./offsetstyle";
import { FC } from "react";
import { UserSettings } from "../../lib";

interface Props {
  buttonPosition?: UserSettings["buttonPosition"];
}

export const ContainerStyle: FC<Props> = ({ buttonPosition }) => {
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
