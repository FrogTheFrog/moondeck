import { UserSettings } from "../../lib";
import { VFC } from "react";

interface Props {
  buttonPosition?: UserSettings["buttonPosition"];
}

export const achorPositionName = "--moondeck-anchor-pos";
export const xOffsetName = "--moondeck-x-offset";
export const yOffsetName = "--moondeck-y-offset";
export const ySpecialOffsetName = "--moondeck-y-special-offset";

export const OffsetStyle: VFC<Props> = ({ buttonPosition }) => {
  if (!buttonPosition) {
    return null;
  }
  return (
    <style>
      {
        `
          :root {
            ${achorPositionName}: ${buttonPosition.horizontalAlignment === "top" ? "static" : "relative"};
            ${xOffsetName}: ${buttonPosition.offsetX || "0px"};
            ${yOffsetName}: ${buttonPosition.offsetY || "0px"};
            ${ySpecialOffsetName}: ${buttonPosition.offsetForHltb ? "85px" : "0px"};
          }
        `
      }
    </style>
  );
};
