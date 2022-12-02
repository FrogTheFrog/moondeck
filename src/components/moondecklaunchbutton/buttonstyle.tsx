import { ReactElement, VFC } from "react";
import { UserSettings } from "../../lib";

interface Props {
  theme: UserSettings["buttonStyle"]["theme"];
}

const HighContrastStyle = (
  <style>
    {
      `
        .moondeck-button {
          background: #222;
        }
        
        .moondeck-button:hover {
          background: #50555D;
        }
        
        .moondeck-button:focus {
          background: #fff;
        }
      `
    }
  </style>
);

const CleanStyle = (
  <style>
    {
      `
        .moondeck-button {
          background: rgba(14, 20, 27, 0.5);
        }
        
        .moondeck-button:hover {
          background: rgba(14, 20, 27, 0.75);
        }
      `
    }
  </style>
);

function getThemeElement(theme: UserSettings["buttonStyle"]["theme"]): ReactElement {
  switch (theme) {
    case "HighContrast":
      return HighContrastStyle;
    case "Clean":
    default:
      return CleanStyle;
  }
}

export const ButtonStyle: VFC<Props> = ({ theme }) => {
  return (
    <>
      {getThemeElement(theme)}
      <style>
        {
          `
            .moondeck-button {
              margin: 0 !important;
            }

            .moondeck-button:focus > svg {
              fill: #000;
            }
          `
        }
      </style>
    </>
  );
};
